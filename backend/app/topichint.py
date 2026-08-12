"""Deteksi salah pilih topik dan arahkan user ke topik yang lebih tepat.

Semua lookup di sini MURNI lokal ke registry (tidak memanggil Gemini).
Satu-satunya panggilan Gemini tambahan dilakukan oleh rag.py, dan HANYA ketika
jawaban terdeteksi kosong. Pertanyaan normal = 0 overhead kuota.
"""
from app import registry
from app.related import _basename, _indexes, _slug

_NOT_FOUND = (
    "belum ada di knowledge base",
    "tidak ada di knowledge base",
    "tidak ada dalam knowledge base",
    "belum tersedia di knowledge base",
    "tidak tersedia di knowledge base",
    "tidak ditemukan di knowledge base",
    "di luar knowledge base",
    "tidak ada informasi",
    "belum ada informasi",
    "tidak menemukan informasi",
    "tidak dapat menemukan",
)

_MAX_SUGGESTIONS = 3


def looks_unanswered(answer: str) -> bool:
    """True kalau jawaban bot seperti 'tidak ada di knowledge base'."""
    low = (answer or "").strip().lower()
    if not low:
        return True
    return any(p in low for p in _NOT_FOUND)


def _find_doc(name, by_name, by_slug):
    name = (name or "").strip()
    if not name:
        return None
    if name in by_name:
        return by_name[name]
    base = _basename(name)
    if base in by_name:
        return by_name[base]
    return by_slug.get(_slug(name))


def topics_from_citations(citations, exclude_topic: str = "") -> list[dict]:
    """Topik milik dokumen yang disitir, untuk disarankan sebagai pengganti.

    Kembalikan list of {topic, domain, source}, tanpa duplikat dan tanpa topik
    yang sedang dipilih user.
    """
    if not citations:
        return []
    docs = registry.list_docs()
    if not docs:
        return []
    by_name, by_slug = _indexes(docs)

    skip = (exclude_topic or "").strip().lower()
    out: list[dict] = []
    seen: set[str] = set()

    for cit in citations:
        doc = _find_doc(cit.get("source") or "", by_name, by_slug)
        if not doc:
            continue
        source = doc.get("display_name") or doc.get("filename") or ""
        domain = doc.get("domain") or ""
        for raw in doc.get("topics") or []:
            topic = (raw or "").strip()
            key = topic.lower()
            if not topic or key == skip or key in seen:
                continue
            seen.add(key)
            out.append({"topic": topic, "domain": domain, "source": source})
            if len(out) >= _MAX_SUGGESTIONS:
                return out

    return out
