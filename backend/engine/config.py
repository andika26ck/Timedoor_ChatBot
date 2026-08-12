"""Konfigurasi engine RAG (retrieval-augmented generation).

Semua bisa dioverride lewat environment variable; default aman untuk dev.
"""
from __future__ import annotations

import os
from pathlib import Path

_BACKEND_DIR = Path(__file__).resolve().parent.parent

# Lokasi dokumen knowledge base (.md)
DOCS_DIR = Path(os.getenv("RAG_DOCS_DIR") or (_BACKEND_DIR / "data"))

# Tempat indeks vektor lokal disimpan (hanya dipakai backend "jsonl")
INDEX_DIR = Path(os.getenv("RAG_INDEX_DIR") or (_BACKEND_DIR / "index_cache"))

# Model embedding Gemini
EMBED_MODEL = os.getenv("RAG_EMBED_MODEL", "gemini-embedding-001")
# Panjang vektor: 3072 (default model) | 1536 | 768. Kecil = hemat penyimpanan.
EMBED_DIM = int(os.getenv("RAG_EMBED_DIM", "768"))

# Chunking (estimasi berbasis kata; 1 token ~= 0.75 kata)
CHUNK_MAX_TOKENS = int(os.getenv("RAG_CHUNK_MAX_TOKENS", "600"))
CHUNK_OVERLAP_TOKENS = int(os.getenv("RAG_CHUNK_OVERLAP_TOKENS", "120"))

# Backend penyimpanan: "postgres" (PostgreSQL+pgvector, utama) atau "jsonl" (uji offline)
STORE_BACKEND = os.getenv("RAG_STORE_BACKEND", "postgres")

# MOCK=1 -> vektor tiruan tanpa panggil API (untuk uji pipeline offline)
MOCK_EMBED = os.getenv("RAG_MOCK_EMBED", "0") in ("1", "true", "True")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")


# --- PostgreSQL + pgvector (backend penyimpanan utama) ---
# Aktifkan dengan RAG_STORE_BACKEND=postgres
# Contoh DSN: postgresql://user:password@localhost:5432/faqbot
PG_DSN = os.getenv("RAG_PG_DSN", "")
PG_TABLE = os.getenv("RAG_PG_TABLE", "faq_kb")


def summary() -> str:
    mode = "MOCK" if MOCK_EMBED else "API"
    return (
        f"Docs   : {DOCS_DIR}\n"
        f"Index  : {INDEX_DIR}\n"
        f"Backend: {STORE_BACKEND}\n"
        f"Model  : {EMBED_MODEL} (dim={EMBED_DIM}) [{mode}]\n"
        f"Chunk  : max={CHUNK_MAX_TOKENS} overlap={CHUNK_OVERLAP_TOKENS} token"
    )
