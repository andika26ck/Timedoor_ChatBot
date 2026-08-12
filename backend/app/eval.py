"""app/eval.py — Alat evaluasi jawaban bot untuk testing (CLI).

Untuk tiap pertanyaan, alat ini menampilkan DUA \"persen\":
  1) Kecocokan dokumen (retrieval)  -> cosine similarity chunk KB teratas
     terhadap pertanyaan. Sinyal objektif seberapa nyambung KB dengan pertanyaan.
  2) Groundedness jawaban           -> penilaian AI: berapa % isi jawaban yang
     benar-benar didukung KONTEKS yang diambil (mendeteksi halusinasi).

Dipakai langsung dari folder backend (pipeline sama persis dengan bot):

  # Mode tunggal
  python -m app.eval "cara generate schedule?"
  python -m app.eval "..." --domain "CMS Admin" --topic jadwal
  python -m app.eval "..." --json

  # Mode batch (satu pertanyaan per baris; baris diawali # diabaikan;
  # kolom opsional dipisah TAB:  pertanyaan<TAB>domain<TAB>topik)
  python -m app.eval --file eval_questions.example.txt
  python -m app.eval --file eval_questions.example.txt --csv hasil.csv

Opsi:
  --top-k N     jumlah chunk konteks (default = TOP_K di rag.py)
  --no-judge    lewati penilaian groundedness (tanpa panggilan Gemini ekstra)
  --json        cetak hasil sebagai JSON (mode tunggal)
"""
from __future__ import annotations

import argparse
import csv
import json
import os
import re
import sys
import time

from google.genai import types

from app import rag
from app.settings_store import get_classify_model, get_model
from app.store import client


# Model untuk penilai groundedness. Default: model 'lite' (kuota terpisah dari
# model jawaban), override via env RAG_JUDGE_MODEL. Memisahkan model juri dari
# model jawaban menggandakan throughput di free tier (kuota dihitung per-model).
def _judge_model() -> str:
    return (os.getenv("RAG_JUDGE_MODEL") or "").strip() or get_classify_model()


_QUOTA_MARKERS = ("429", "resource_exhausted", "quota")


def _is_quota(msg: str) -> bool:
    low = msg.lower()
    return any(m in low for m in _QUOTA_MARKERS)


def _retry_delay_sec(msg: str, default: float = 2.0) -> float:
    m = re.search(r"retry in ([0-9.]+)\s*s", msg, re.IGNORECASE)
    if not m:
        m = re.search(r"retrydelay['\"]?\s*[:=]\s*['\"]?([0-9.]+)\s*s", msg, re.IGNORECASE)
    try:
        return min(float(m.group(1)), 60.0) if m else default
    except Exception:  # noqa: BLE001
        return default


# --------------------------------------------------------------------------
# Util
# --------------------------------------------------------------------------
def _clamp01(x: float) -> float:
    return max(0.0, min(1.0, x))


def _label(pct: float) -> str:
    if pct >= 75:
        return "kuat"
    if pct >= 55:
        return "sedang"
    if pct >= 35:
        return "lemah"
    return "sangat lemah"


def _source_of(hit: dict) -> str:
    meta = hit.get("metadata") or {}
    return (
        meta.get("judul")
        or meta.get("doc_name")
        or hit.get("doc_id")
        or "dokumen"
    )


# --------------------------------------------------------------------------
# Generasi jawaban (mengikuti persis jalur rag.ask: prompt + config + retry)
# --------------------------------------------------------------------------
def _generate_answer(hits: list[dict], question: str) -> str:
    prompt = rag._prompt(question, hits)
    last_exc: Exception | None = None
    for attempt in range(rag._MAX_RETRIES):
        try:
            resp = client.models.generate_content(
                model=get_model(),
                contents=prompt,
                config=rag._gen_config(),
            )
            return (getattr(resp, "text", "") or "").strip()
        except Exception as exc:  # noqa: BLE001
            last_exc = exc
            msg = str(exc)
            if attempt < rag._MAX_RETRIES - 1 and (rag._is_transient(msg) or _is_quota(msg)):
                time.sleep(_retry_delay_sec(msg) if _is_quota(msg) else 1.5 * (attempt + 1))
                continue
            raise
    assert last_exc is not None
    raise last_exc


# --------------------------------------------------------------------------
# Penilai groundedness (LLM-as-judge)
# --------------------------------------------------------------------------
_JUDGE_INSTRUCTION = (
    "Kamu evaluator ketat untuk sistem tanya-jawab berbasis dokumen. "
    "Tugasmu menilai seberapa besar ISI JAWABAN benar-benar didukung oleh KONTEKS. "
    "Fokus pada klaim faktual (angka, langkah, nama menu, aturan); abaikan gaya bahasa. "
    "Klaim yang tidak ada di KONTEKS dihitung TIDAK didukung, meskipun terdengar masuk akal. "
    "Jika JAWABAN dengan jujur menyatakan informasi tidak tersedia DAN KONTEKS memang "
    "kosong/tak relevan, anggap sepenuhnya didukung (groundedness 100). "
    "Balas HANYA JSON valid berbentuk: "
    '{"groundedness": <bilangan bulat 0-100>, '
    '"didukung": [<klaim singkat>], "tidak_didukung": [<klaim singkat>], '
    '"alasan": "<ringkas>"}.'
)


def _parse_judge(raw: str) -> dict | None:
    if not raw:
        return None
    txt = raw.strip()
    if txt.startswith("```"):
        txt = re.sub(r"^```[a-zA-Z]*\n?", "", txt)
        txt = re.sub(r"\n?```$", "", txt).strip()
    try:
        data = json.loads(txt)
    except Exception:  # noqa: BLE001
        m = re.search(r"\d{1,3}", txt)
        if not m:
            return None
        data = {"groundedness": int(m.group()), "alasan": txt[:300]}
    if not isinstance(data, dict):
        return None
    try:
        data["groundedness"] = max(0, min(100, int(round(float(data.get("groundedness"))))))
    except Exception:  # noqa: BLE001
        return None
    return data


def _judge_groundedness(context: str, question: str, answer: str) -> dict | None:
    prompt = (
        f"KONTEKS:\n{context or '(kosong)'}\n\n"
        f"PERTANYAAN: {question}\n\n"
        f"JAWABAN:\n{answer}\n\n"
        "Nilai groundedness JAWABAN terhadap KONTEKS."
    )
    cfg = types.GenerateContentConfig(
        system_instruction=_JUDGE_INSTRUCTION,
        temperature=0.0,
        max_output_tokens=1024,
        response_mime_type="application/json",
    )
    raw = ""
    for attempt in range(rag._MAX_RETRIES):
        try:
            resp = client.models.generate_content(
                model=_judge_model(),
                contents=prompt,
                config=cfg,
            )
            raw = (getattr(resp, "text", "") or "").strip()
            break
        except Exception as exc:  # noqa: BLE001
            msg = str(exc)
            if attempt < rag._MAX_RETRIES - 1 and (rag._is_transient(msg) or _is_quota(msg)):
                time.sleep(_retry_delay_sec(msg) if _is_quota(msg) else 1.5 * (attempt + 1))
                continue
            return {"error": msg}
    return _parse_judge(raw)


# --------------------------------------------------------------------------
# Evaluasi satu pertanyaan
# --------------------------------------------------------------------------
def evaluate(
    question: str,
    domain: str | None = None,
    topic: str | None = None,
    top_k: int | None = None,
    judge: bool = True,
) -> dict:
    old_top_k = rag.TOP_K
    if top_k:
        rag.TOP_K = int(top_k)
    try:
        hits = rag._retrieve(question, domain, topic)
    finally:
        rag.TOP_K = old_top_k

    scores = [_clamp01(float(h.get("score") or 0.0)) for h in hits]
    top1 = scores[0] if scores else 0.0
    mean_k = (sum(scores) / len(scores)) if scores else 0.0

    answer = _generate_answer(hits, question)
    context = rag._build_context(hits)

    result: dict = {
        "question": question,
        "domain": domain,
        "topic": topic,
        "retrieval_top1_pct": round(top1 * 100, 1),
        "retrieval_mean_pct": round(mean_k * 100, 1),
        "chunk_scores": [
            {"rank": i + 1, "pct": round(scores[i] * 100, 1), "source": _source_of(h)}
            for i, h in enumerate(hits)
        ],
        "top_source": _source_of(hits[0]) if hits else None,
        "answer": answer,
        "groundedness_pct": None,
        "groundedness": None,
    }
    if judge:
        j = _judge_groundedness(context, question, answer)
        result["groundedness"] = j
        if j and isinstance(j.get("groundedness"), int):
            result["groundedness_pct"] = j["groundedness"]
    return result


# --------------------------------------------------------------------------
# Cetak
# --------------------------------------------------------------------------
BAR = "=" * 64
SUB = "-" * 64


def _print_single(r: dict) -> None:
    print(BAR)
    print(f"[?] Pertanyaan: {r['question']}")
    if r.get("domain") or r.get("topic"):
        print(f"    filter -> domain={r.get('domain')!r}  topik={r.get('topic')!r}")
    print(SUB)
    print(
        f"[1] Kecocokan dokumen (retrieval): {r['retrieval_top1_pct']}%  "
        f"[{_label(r['retrieval_top1_pct'])}]   (rata-rata top-K: {r['retrieval_mean_pct']}%)"
    )
    for c in r["chunk_scores"]:
        print(f"      #{c['rank']}  {c['pct']:>5}%  {c['source']}")
    gp = r.get("groundedness_pct")
    if gp is not None:
        print(f"[2] Groundedness jawaban: {gp}%  [{_label(gp)}]")
        j = r.get("groundedness") or {}
        und = j.get("tidak_didukung") or []
        if und:
            print("      klaim TIDAK didukung konteks:")
            for c in und[:5]:
                print(f"        - {c}")
        if j.get("alasan"):
            print(f"      alasan: {j['alasan']}")
    else:
        j = r.get("groundedness") or {}
        if j.get("error"):
            print(f"[2] Groundedness: (gagal menilai: {j['error']})")
    print(SUB)
    print("[>] Jawaban:")
    print(r["answer"])
    print(BAR)


def _print_batch_row(i: int, r: dict) -> None:
    gp = r.get("groundedness_pct")
    gp_s = f"{gp}%" if gp is not None else "  -"
    print(
        f"{i:>3}. retr {r['retrieval_top1_pct']:>5}%  |  ground {gp_s:>5}  |  "
        f"{r['question'][:70]}"
    )


# --------------------------------------------------------------------------
# Batch
# --------------------------------------------------------------------------
def _read_questions(path: str) -> list[tuple[str, str | None, str | None]]:
    items: list[tuple[str, str | None, str | None]] = []
    with open(path, encoding="utf-8") as f:
        for line in f:
            s = line.rstrip("\n")
            if not s.strip() or s.lstrip().startswith("#"):
                continue
            parts = s.split("\t")
            q = parts[0].strip()
            if not q:
                continue
            domain = parts[1].strip() if len(parts) > 1 and parts[1].strip() else None
            topic = parts[2].strip() if len(parts) > 2 and parts[2].strip() else None
            items.append((q, domain, topic))
    return items


def _write_csv(path: str, rows: list[dict]) -> None:
    cols = [
        "no",
        "question",
        "domain",
        "topic",
        "retrieval_top1_pct",
        "retrieval_mean_pct",
        "groundedness_pct",
        "top_source",
        "answer",
    ]
    with open(path, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=cols)
        w.writeheader()
        for i, r in enumerate(rows, 1):
            w.writerow(
                {
                    "no": i,
                    "question": r["question"],
                    "domain": r.get("domain") or "",
                    "topic": r.get("topic") or "",
                    "retrieval_top1_pct": r["retrieval_top1_pct"],
                    "retrieval_mean_pct": r["retrieval_mean_pct"],
                    "groundedness_pct": r.get("groundedness_pct")
                    if r.get("groundedness_pct") is not None
                    else "",
                    "top_source": r.get("top_source") or "",
                    "answer": r["answer"],
                }
            )


def _avg(vals: list[float]) -> float:
    return round(sum(vals) / len(vals), 1) if vals else 0.0


# --------------------------------------------------------------------------
# CLI
# --------------------------------------------------------------------------
def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(
        prog="python -m app.eval",
        description="Evaluasi jawaban bot: % kecocokan retrieval + % groundedness.",
    )
    ap.add_argument("question", nargs="?", help="pertanyaan (mode tunggal)")
    ap.add_argument("--file", help="file berisi daftar pertanyaan (mode batch)")
    ap.add_argument("--csv", help="tulis hasil batch ke file CSV")
    ap.add_argument("--domain", default=None, help="filter domain (mode tunggal)")
    ap.add_argument("--topic", default=None, help="filter topik (mode tunggal)")
    ap.add_argument("--top-k", type=int, default=None, help="jumlah chunk konteks")
    ap.add_argument("--no-judge", action="store_true", help="lewati groundedness")
    ap.add_argument("--sleep", type=float, default=0.0, help="jeda detik antar pertanyaan (batch) untuk hindari limit per menit")
    ap.add_argument("--json", action="store_true", help="cetak JSON (mode tunggal)")
    args = ap.parse_args(argv)

    judge = not args.no_judge

    if args.file:
        items = _read_questions(args.file)
        if not items:
            print("(file pertanyaan kosong)")
            return 1
        print(f"Menguji {len(items)} pertanyaan...\n")
        rows: list[dict] = []
        for i, (q, domain, topic) in enumerate(items, 1):
            try:
                r = evaluate(q, domain, topic, top_k=args.top_k, judge=judge)
            except Exception as exc:  # noqa: BLE001
                print(f"{i:>3}. ERROR: {exc}  |  {q[:70]}")
                continue
            rows.append(r)
            _print_batch_row(i, r)
            if args.sleep:
                time.sleep(args.sleep)
        if rows:
            print(SUB)
            print(
                f"Rata-rata: kecocokan {_avg([r['retrieval_top1_pct'] for r in rows])}%  |  "
                f"groundedness "
                f"{_avg([r['groundedness_pct'] for r in rows if r.get('groundedness_pct') is not None])}%"
            )
        if args.csv and rows:
            _write_csv(args.csv, rows)
            print(f"CSV ditulis: {args.csv}")
        return 0

    if not args.question:
        ap.print_help()
        return 1

    r = evaluate(args.question, args.domain, args.topic, top_k=args.top_k, judge=judge)
    if args.json:
        r.pop("groundedness", None)
        print(json.dumps(r, ensure_ascii=False, indent=2))
    else:
        _print_single(r)
    return 0


if __name__ == "__main__":
    sys.exit(main())
