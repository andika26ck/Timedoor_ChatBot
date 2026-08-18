"""app/rag.py — Retrieval + jawaban (Cobee).

Penyimpanan knowledge base: PostgreSQL + pgvector
----------------------------------------------
Retrieval memakai embedding Gemini + pencarian vektor di PostgreSQL/pgvector
(paket engine). Logika & antarmuka publik dijaga stabil:
  - ask(question, domain, topic)         -> dict {answer, citations, related_docs}
  - ask_stream(question, domain, topic)  -> generator event {type, value}
  - filter domain (Level 3) & topik (Level 1) tetap ada, dengan fallback aman
    supaya bot tidak pernah \"mati\" walau filter tidak menghasilkan apa pun.
"""
from __future__ import annotations

import logging
import os
import time

from google.genai import types

from app import registry
from app.related import related_docs_for
from app.settings_store import get_classify_model, get_model, get_system_prompt
from app.store import client, get_store_name, get_vector_store
from engine.embedder import embed_query

logger = logging.getLogger("faq-bot")

# Berapa chunk yang dipakai sebagai konteks jawaban.
TOP_K = int(os.getenv("RAG_TOP_K", "5"))

# Batas atas Top-K untuk panel "Uji Pencarian" (retrieval-only) di sisi admin,
# supaya admin tidak meminta terlalu banyak chunk sekaligus.
_DEBUG_MAX_TOP_K = int(os.getenv("RAG_DEBUG_MAX_TOP_K", "50"))

_TRANSIENT = ("503", "unavailable", "overloaded", "high demand", "deadline")
_MAX_RETRIES = 3


def _empty_kb_error() -> RuntimeError:
    return RuntimeError(
        "Knowledge base masih kosong. Tambahkan dokumen dulu lewat menu "
        "\"Dokumen\" (atau jalankan `python -m engine.build_index`), baru ajukan "
        "pertanyaan."
    )


# --------------------------------------------------------------------------
# Retrieval
# --------------------------------------------------------------------------
def _match_domain(meta: dict, domain: str) -> bool:
    return str((meta or {}).get("domain") or "").strip().lower() == domain.strip().lower()


def _files_for_topic(topic: str) -> set[str]:
    """doc_id (= filename di registry) yang punya topik tertentu."""
    t = (topic or "").strip().lower()
    allowed: set[str] = set()
    if not t:
        return allowed
    for d in registry.list_docs():
        topics = [str(x).strip().lower() for x in (d.get("topics") or [])]
        if t in topics:
            fn = d.get("filename") or ""
            if fn:
                allowed.add(fn)
    return allowed


def _doc_id_of(hit: dict) -> str:
    return str(hit.get("doc_id") or (hit.get("metadata") or {}).get("doc_id") or "")


def _retrieve(question: str, domain: str | None, topic: str | None) -> list[dict]:
    store = get_vector_store()
    qvec = embed_query(question)

    domain = (domain or "").strip()
    topic = (topic or "").strip()
    need_filter = bool(domain or topic)

    # Ambil lebih banyak kandidat saat memfilter, supaya hasil setelah filter
    # tetap cukup.
    fetch_k = max(TOP_K * 5, 25) if need_filter else TOP_K
    hits = store.search(list(qvec), top_k=fetch_k)

    # Filter domain (fallback: kalau kosong, pakai hasil sebelum filter).
    if domain:
        filtered = [h for h in hits if _match_domain(h.get("metadata"), domain)]
        if filtered:
            hits = filtered
        else:
            logger.info("Filter domain '%s' tak ada hasil — fallback tanpa filter.", domain)

    # Filter topik (best-effort lewat registry; fallback aman juga).
    if topic:
        allowed = _files_for_topic(topic)
        if allowed:
            filtered = [h for h in hits if _doc_id_of(h) in allowed]
            if filtered:
                hits = filtered
            else:
                logger.info("Filter topik '%s' tak ada hasil — fallback.", topic)

    return hits[:TOP_K]


# --------------------------------------------------------------------------
# Sitasi & konteks
# --------------------------------------------------------------------------
def _citations(hits: list[dict]) -> list[dict]:
    """Bentuk citation: {source, snippet}. `source` diambil dari display_name
    di registry (kalau ada) supaya cocok dengan fitur \"Baca juga\"."""
    by_file = {d.get("filename"): d for d in registry.list_docs()}
    cits: list[dict] = []
    seen: set[str] = set()
    for h in hits:
        meta = h.get("metadata") or {}
        doc_id = _doc_id_of(h)
        entry = by_file.get(doc_id)
        source = (
            (entry.get("display_name") if entry else None)
            or meta.get("judul")
            or meta.get("display_name")
            or meta.get("doc_name")
            or doc_id
            or "dokumen"
        )
        if source in seen:
            continue
        seen.add(source)
        cits.append({"source": source, "snippet": (h.get("text") or "")[:600]})
    return cits


def _build_context(hits: list[dict]) -> str:
    parts = []
    for i, h in enumerate(hits, start=1):
        meta = h.get("metadata") or {}
        label = meta.get("judul") or meta.get("doc_name") or _doc_id_of(h) or f"Sumber {i}"
        parts.append(f"[Sumber {i}: {label}]\n{h.get('text', '')}")
    return "\n\n---\n\n".join(parts)


# --------------------------------------------------------------------------
# Multi-turn: riwayat percakapan & penulisan ulang pertanyaan
# --------------------------------------------------------------------------
# Berapa pesan terakhir yang dijadikan konteks (jaga-jaga bila frontend kirim
# lebih banyak).
_HISTORY_MAX_TURNS = 6
# Potong tiap pesan riwayat agar prompt tidak membengkak.
_HISTORY_MAX_CHARS = 800
# Batas token untuk penulisan ulang pertanyaan (murah; pakai model classify).
_CONDENSE_MAX_TOKENS = 256


def _transcript(history: list[dict] | None) -> str:
    """Rangkai beberapa giliran terakhir jadi transkrip ringkas untuk prompt."""
    turns = [h for h in (history or []) if str(h.get("text") or "").strip()]
    turns = turns[-_HISTORY_MAX_TURNS:]
    lines: list[str] = []
    for h in turns:
        role = "User" if str(h.get("role")).strip().lower() == "user" else "Cobee"
        text = str(h.get("text") or "").strip()
        if len(text) > _HISTORY_MAX_CHARS:
            text = text[:_HISTORY_MAX_CHARS] + "\u2026"
        lines.append(f"{role}: {text}")
    return "\n".join(lines)


def _condense_question(question: str, history: list[dict] | None) -> str:
    """Ubah pertanyaan lanjutan yang ambigu jadi satu pertanyaan mandiri.

    Dipakai HANYA untuk retrieval (pencarian dokumen), supaya pertanyaan
    seperti "kalau yang itu gimana?" tetap menemukan dokumen yang tepat.
    Memakai model classify (flash-lite) agar tidak menghabiskan kuota model
    penjawab. Kalau gagal (kuota/eror), aman: pakai pertanyaan aslinya.
    """
    convo = _transcript(history)
    if not convo:
        return question
    prompt = (
        "Tugasmu HANYA menulis ulang PERTANYAAN LANJUTAN menjadi satu pertanyaan "
        "mandiri yang utuh dan bisa dipahami tanpa membaca riwayat. Pertahankan "
        "bahasa aslinya. Jika sudah mandiri, salin apa adanya. Jangan menjawab "
        "pertanyaannya. Keluarkan HANYA teks pertanyaannya, tanpa tanda kutip.\n\n"
        f"RIWAYAT:\n{convo}\n\n"
        f"PERTANYAAN LANJUTAN: {question}\n\n"
        "PERTANYAAN MANDIRI:"
    )
    try:
        resp = client.models.generate_content(
            model=get_classify_model(),
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.0,
                max_output_tokens=_CONDENSE_MAX_TOKENS,
            ),
        )
        out = (getattr(resp, "text", "") or "").strip().strip('"').strip()
        return out or question
    except Exception as exc:  # noqa: BLE001
        logger.info("Penulisan ulang pertanyaan gagal, pakai aslinya: %s", exc)
        return question


def _prompt(question: str, hits: list[dict], history: list[dict] | None = None) -> str:
    convo = _transcript(history)
    convo_block = (
        f"RIWAYAT PERCAKAPAN (konteks; jangan diulang di jawaban):\n{convo}\n\n"
        if convo
        else ""
    )
    if hits:
        return (
            f"{convo_block}"
            f"KONTEKS:\n{_build_context(hits)}\n\n"
            f"PERTANYAAN: {question}\n\n"
            "Jawab hanya berdasarkan KONTEKS di atas."
        )
    return (
        f"{convo_block}"
        f"PERTANYAAN: {question}\n\n"
        "Tidak ada konteks yang relevan di knowledge base. Sampaikan dengan jujur "
        "bahwa informasinya belum tersedia dan sarankan menghubungi tim terkait."
    )


def _gen_config() -> types.GenerateContentConfig:
    return types.GenerateContentConfig(
        system_instruction=get_system_prompt(),
        temperature=0.2,
        max_output_tokens=4096,
    )


def _is_transient(msg: str) -> bool:
    low = msg.lower()
    return any(t in low for t in _TRANSIENT)


# --------------------------------------------------------------------------
# API publik
# --------------------------------------------------------------------------
def ask(
    question: str,
    domain: str | None = None,
    topic: str | None = None,
    history: list[dict] | None = None,
) -> dict:
    if not get_store_name():
        raise _empty_kb_error()

    search_q = _condense_question(question, history) if history else question
    hits = _retrieve(search_q, domain, topic)
    prompt = _prompt(question, hits, history)

    last_exc: Exception | None = None
    for attempt in range(_MAX_RETRIES):
        try:
            resp = client.models.generate_content(
                model=get_model(),
                contents=prompt,
                config=_gen_config(),
            )
            answer = (getattr(resp, "text", "") or "").strip()
            citations = _citations(hits) if hits else []
            return {
                "answer": answer,
                "citations": citations,
                "related_docs": related_docs_for(citations),
            }
        except Exception as exc:  # noqa: BLE001
            last_exc = exc
            if attempt < _MAX_RETRIES - 1 and _is_transient(str(exc)):
                time.sleep(1.5 * (attempt + 1))
                continue
            raise
    assert last_exc is not None
    raise last_exc


def ask_stream(
    question: str,
    domain: str | None = None,
    topic: str | None = None,
    history: list[dict] | None = None,
):
    """Generator event untuk SSE. Urutan: text* -> citations -> related."""
    if not get_store_name():
        raise _empty_kb_error()

    search_q = _condense_question(question, history) if history else question
    hits = _retrieve(search_q, domain, topic)
    citations = _citations(hits) if hits else []
    prompt = _prompt(question, hits, history)

    stream = client.models.generate_content_stream(
        model=get_model(),
        contents=prompt,
        config=_gen_config(),
    )
    for chunk in stream:
        text = getattr(chunk, "text", None)
        if text:
            yield {"type": "text", "value": text}

    yield {"type": "citations", "value": citations}
    yield {"type": "related", "value": related_docs_for(citations)}


# --------------------------------------------------------------------------
# Uji Pencarian (retrieval-only) — untuk panel debug admin
# --------------------------------------------------------------------------
def _topics_of(entry: dict | None, meta: dict) -> list[str]:
    """Daftar topik dari registry (list) atau metadata chunk (string CSV)."""
    if entry and entry.get("topics"):
        return [str(t).strip() for t in entry.get("topics") if str(t).strip()]
    raw = (meta or {}).get("topics")
    if isinstance(raw, str):
        return [t.strip() for t in raw.split(",") if t.strip()]
    if isinstance(raw, list):
        return [str(t).strip() for t in raw if str(t).strip()]
    return []


def search_debug(
    question: str,
    domain: str | None = None,
    topic: str | None = None,
    top_k: int | None = None,
    history: list[dict] | None = None,
    condense: bool = False,
) -> dict:
    """Retrieval-only untuk panel "Uji Pencarian" (visualisasi chunk/skor).

    Menjalankan embedding pertanyaan + pencarian vektor lalu mengembalikan
    daftar chunk TERURUT SKOR beserta metadata \u2014 TANPA memanggil model
    penjawab. Berguna untuk memeriksa kualitas retrieval, dampak filter
    domain/topik, dan sebaran skor sebelum jawaban LLM dibuat.

    Berbeda dari alur `ask()`, penulisan ulang pertanyaan (multi-turn) di sini
    default MATI supaya admin melihat persis apa yang terambil untuk teks yang
    mereka ketik; nyalakan lewat `condense=True` bila perlu.
    """
    if not get_store_name():
        raise _empty_kb_error()

    q_raw = (question or "").strip()
    if not q_raw:
        raise ValueError("Pertanyaan tidak boleh kosong.")

    search_q = _condense_question(q_raw, history) if (condense and history) else q_raw

    k = TOP_K if not top_k or int(top_k) <= 0 else min(int(top_k), _DEBUG_MAX_TOP_K)

    store = get_vector_store()
    qvec = embed_query(search_q)

    domain = (domain or "").strip()
    topic = (topic or "").strip()
    need_filter = bool(domain or topic)
    fetch_k = max(k * 5, 25) if need_filter else k

    raw_hits = store.search(list(qvec), top_k=fetch_k)
    candidates = len(raw_hits)

    hits = raw_hits
    domain_applied = domain_fallback = False
    if domain:
        filtered = [h for h in hits if _match_domain(h.get("metadata"), domain)]
        if filtered:
            hits, domain_applied = filtered, True
        else:
            domain_fallback = True

    topic_applied = topic_fallback = False
    if topic:
        allowed = _files_for_topic(topic)
        if allowed:
            filtered = [h for h in hits if _doc_id_of(h) in allowed]
            if filtered:
                hits, topic_applied = filtered, True
            else:
                topic_fallback = True
        else:
            topic_fallback = True

    top_hits = hits[:k]

    by_file = {d.get("filename"): d for d in registry.list_docs()}
    results: list[dict] = []
    for rank, h in enumerate(top_hits, start=1):
        meta = h.get("metadata") or {}
        doc_id = _doc_id_of(h)
        entry = by_file.get(doc_id)
        source = (
            (entry.get("display_name") if entry else None)
            or meta.get("judul")
            or meta.get("display_name")
            or meta.get("doc_name")
            or doc_id
            or "dokumen"
        )
        text = h.get("text") or ""
        chunk_index = meta.get("chunk_index")
        approx = meta.get("approx_tokens")
        results.append(
            {
                "rank": rank,
                "score": round(float(h.get("score") or 0.0), 6),
                "id": str(h.get("id") or ""),
                "doc_id": doc_id,
                "source": source,
                "doc_name": meta.get("doc_name") or "",
                "chunk_index": int(chunk_index)
                if isinstance(chunk_index, (int, float))
                else None,
                "domain": (entry.get("domain") if entry else None)
                or meta.get("domain")
                or "",
                "category": (entry.get("category") if entry else None)
                or meta.get("kategori")
                or "",
                "topics": _topics_of(entry, meta),
                "approx_tokens": int(approx)
                if isinstance(approx, (int, float))
                else None,
                "char_count": len(text),
                "text": text,
            }
        )

    return {
        "query": q_raw,
        "search_query": search_q,
        "rewritten": bool(search_q != q_raw),
        "top_k": k,
        "candidates": candidates,
        "returned": len(results),
        "filters": {
            "domain": domain,
            "topic": topic,
            "domain_applied": domain_applied,
            "domain_fallback": domain_fallback,
            "topic_applied": topic_applied,
            "topic_fallback": topic_fallback,
        },
        "results": results,
    }
