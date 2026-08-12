"""Fase 2 (retrieval): embed pertanyaan -> cari chunk terdekat di indeks.

    python -m engine.search "cara mengganti jadwal kelas"
    RAG_MOCK_EMBED=1 RAG_STORE_BACKEND=jsonl python -m engine.search "..."   # uji offline
"""
from __future__ import annotations

import sys

from . import config
from .embedder import embed_query
from .vector_store import get_store


def search(question: str, top_k: int = 5) -> list[dict]:
    store = get_store(config.STORE_BACKEND, config.INDEX_DIR)
    qvec = embed_query(question)
    return store.search(qvec, top_k=top_k)


def main() -> int:
    if len(sys.argv) < 2:
        print('Pemakaian: python -m engine.search "pertanyaan kamu"')
        return 1
    question = sys.argv[1]
    top_k = int(sys.argv[2]) if len(sys.argv) > 2 else 5
    hits = search(question, top_k=top_k)
    print(f"Pertanyaan: {question}\n")
    if not hits:
        print("(indeks kosong - jalankan 'python -m engine.build_index' dulu)")
        return 0
    for rank, h in enumerate(hits, 1):
        meta = h.get("metadata", {})
        print(
            f"#{rank}  skor={h['score']:.3f}  {meta.get('doc_name')} "
            f"(chunk {meta.get('chunk_index')})"
        )
        preview = " ".join(h["text"].split())[:200]
        print(f"     {preview}...\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
