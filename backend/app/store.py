"""app/store.py — Lapisan penyimpanan & retrieval knowledge base.

Penyimpanan knowledge base: PostgreSQL + pgvector
----------------------------------------------
Knowledge base disimpan di PostgreSQL + pgvector lewat paket `engine`
(embedder + chunker + vector_store). Fitur & antarmuka publik tetap sama; yang berubah
HANYA tempat menyimpan & mencari vektornya.

Antarmuka publik dijaga supaya modul lain tidak perlu tahu detail penyimpanan:
  - client            : google-genai client (untuk generate jawaban, saran
                        metadata, dan daftar model).
  - get_vector_store(): instance PgVectorStore yang dipakai bersama.
  - get_store_name()  : identitas KB aktif untuk /health (truthy = KB siap).
"""
from __future__ import annotations

import logging

from google import genai

from app.config import settings

# Mengimpor paket engine otomatis memuat .env ke os.environ (lihat engine/__init__.py),
# sehingga embedder mendapatkan GEMINI_API_KEY dengan benar.
from engine import config as engine_config
from engine.vector_store import get_store

logger = logging.getLogger("faq-bot")

# Satu client dipakai bersama: generate jawaban (rag.py), saran metadata
# (classify.py), dan daftar model (models_catalog.py).
client = genai.Client(api_key=settings.gemini_api_key)

_vector_store = None


def get_vector_store():
    """Instance vector store (PostgreSQL + pgvector) yang dipakai bersama."""
    global _vector_store
    if _vector_store is None:
        _vector_store = get_store(engine_config.STORE_BACKEND, engine_config.INDEX_DIR)
    return _vector_store


def reset_vector_store() -> None:
    """Paksa buat ulang koneksi store (mis. setelah error koneksi database)."""
    global _vector_store
    _vector_store = None


def get_store_name() -> str | None:
    """Identitas KB aktif untuk badge /health.

    Truthy  = knowledge base sudah terisi (minimal 1 chunk di Postgres).
    None    = server hidup tapi KB kosong / database belum bisa dihubungi,
              supaya UI bisa membedakannya dari kondisi \"server mati\".
    """
    try:
        if get_vector_store().count() > 0:
            return f"{engine_config.STORE_BACKEND}:{engine_config.PG_TABLE}"
    except Exception as exc:  # noqa: BLE001
        logger.warning("Knowledge base Postgres belum siap: %s", exc)
    return None


# Kompatibilitas nama lama: sebagian pemanggil masih memakai get_or_create_store().
# Beberapa skrip lama masih memanggilnya; arahkan ke store Postgres.
def get_or_create_store():
    """Alias kompatibilitas -> get_vector_store() (Postgres)."""
    return get_vector_store()
