"""Registry dokumen — tabel PostgreSQL terstruktur (bukan lagi JSON).

VERSI POSTGRES TERSTRUKTUR
--------------------------
Dulu daftar dokumen disimpan sebagai list JSON (documents.json), lalu sempat
dipindah ke tabel key-value `app_kv`. Sekarang registry punya tabel sendiri
`documents` dengan KOLOM ASLI (id, display_name, filename, category, domain,
topics, summary, related, dst) supaya:
  - query metadata lebih rapi & cepat (filter domain, hitung per kategori),
  - satu sumber kebenaran di database yang sama dengan chunk/vektor (faq_kb),
  - konsisten: hapus dokumen bisa satu alur dengan chunk-nya.

Antarmuka publik DIPERTAHANKAN sama persis sehingga app/documents.py dan
app/main.py TIDAK perlu diubah:
  list_docs(), get_doc(id), add_doc(entry), remove_doc(id).

Entry (dict) yang masuk/keluar bentuknya identik dengan versi lama, mis.:
  {
    "id": "...", "chunking": {"max_tokens": 800, "overlap": 100},
    "display_name": "...", "filename": "...", "doc_name": "...",
    "chunks": 5, "metadata_indexed": True,
    "category": "SOP", "domain": "CMS Admin", "topics": [...],
    "summary": "...", "related": [...], "uploaded_at": "2026-08-11T..."
  }
Field tak dikenal (kalau ada) disimpan di kolom `extra` (JSONB) supaya tidak
hilang saat baca-tulis (lossless roundtrip).

Migrasi otomatis (sekali jalan) saat tabel `documents` masih kosong:
  1) dari `app_kv` key 'documents.json' (kalau sudah pernah dimigrasi ke KV),
  2) atau dari file JSON lama backend/documents.json,
  3) kalau tidak ada keduanya → tabel tetap kosong.

Koneksi database memakai DSN yang sama dengan vector store (RAG_PG_DSN).
"""
from __future__ import annotations

import json
import logging
import os
import threading
from pathlib import Path

logger = logging.getLogger("faq-bot")

# Nama tabel registry terstruktur.
_TABLE = os.getenv("DOCUMENTS_TABLE", "documents")
# Nama tabel key-value (sumber migrasi bila registry pernah ada di app_kv).
_KV_TABLE = os.getenv("APP_KV_TABLE", "app_kv")
# Lokasi file JSON lama (sumber migrasi paling awal).
_LEGACY_FILE = (
    Path(os.getenv("STATE_DIR") or Path(__file__).resolve().parent.parent)
    / "documents.json"
)

# Kolom bertipe khusus yang perlu (de)serialisasi JSON saat baca/tulis.
_JSON_COLS = ("topics", "related", "chunking", "extra")
# Kolom yang punya representasi tabel sendiri (selain `extra`).
_KNOWN_COLS = (
    "id",
    "display_name",
    "filename",
    "doc_name",
    "chunks",
    "metadata_indexed",
    "category",
    "domain",
    "summary",
    "topics",
    "related",
    "chunking",
    "uploaded_at",
)

# Satu koneksi dipakai bersama, dijaga lock (FastAPI jalankan endpoint sinkron
# di threadpool; koneksi psycopg tidak aman dipakai banyak thread sekaligus).
_DB_LOCK = threading.Lock()
_conn = None
_migrated = False


def _dsn() -> str:
    from engine import config as engine_config

    dsn = engine_config.PG_DSN
    if not dsn:
        raise RuntimeError(
            "RAG_PG_DSN belum diisi. Set ke connection string PostgreSQL, "
            "mis. postgresql://user:pass@localhost:5433/faqbot"
        )
    return dsn


def _connect():
    import psycopg

    conn = psycopg.connect(_dsn(), autocommit=True)
    conn.execute(
        f"""
        CREATE TABLE IF NOT EXISTS {_TABLE} (
            id               TEXT PRIMARY KEY,
            display_name     TEXT,
            filename         TEXT,
            doc_name         TEXT,
            chunks           INTEGER,
            metadata_indexed BOOLEAN,
            category         TEXT,
            domain           TEXT,
            summary          TEXT,
            topics           JSONB   NOT NULL DEFAULT '[]',
            related          JSONB   NOT NULL DEFAULT '[]',
            chunking         JSONB   NOT NULL DEFAULT '{{}}',
            extra            JSONB   NOT NULL DEFAULT '{{}}',
            uploaded_at      TEXT
        )
        """
    )
    return conn


def _get_conn():
    global _conn
    if _conn is None or getattr(_conn, "closed", 1):
        _conn = _connect()
    return _conn


def _run(op):
    """Jalankan op(conn) dengan aman: serialisasi + reconnect sekali bila putus."""
    global _conn
    with _DB_LOCK:
        try:
            _ensure_migrated(_get_conn())
            return op(_get_conn())
        except Exception as exc:  # noqa: BLE001
            logger.warning("Koneksi registry bermasalah, mencoba ulang: %s", exc)
            try:
                if _conn is not None:
                    _conn.close()
            except Exception:  # noqa: BLE001
                pass
            _conn = None
            _ensure_migrated(_get_conn())
            return op(_get_conn())


# ------------------------------ Serialisasi entry ------------------------------


def _entry_to_row(entry: dict) -> dict:
    """Pecah entry dict jadi nilai kolom; sisanya masuk ke `extra`."""
    e = dict(entry or {})
    row = {
        "id": e.pop("id", None),
        "display_name": e.pop("display_name", None),
        "filename": e.pop("filename", None),
        "doc_name": e.pop("doc_name", None),
        "chunks": e.pop("chunks", None),
        "metadata_indexed": e.pop("metadata_indexed", None),
        "category": e.pop("category", None),
        "domain": e.pop("domain", None),
        "summary": e.pop("summary", None),
        "topics": e.pop("topics", None) or [],
        "related": e.pop("related", None) or [],
        "chunking": e.pop("chunking", None) or {},
        "uploaded_at": e.pop("uploaded_at", None),
    }
    row["extra"] = e  # field tak dikenal disimpan utuh
    return row


def _row_to_entry(row: dict) -> dict:
    """Gabung kolom + `extra` jadi entry dict seperti versi lama (lossless)."""
    extra = row.get("extra") or {}
    entry: dict = dict(extra)
    for col in _KNOWN_COLS:
        val = row.get(col)
        if col == "topics" or col == "related":
            entry[col] = val or []
        elif col == "chunking":
            entry[col] = val or {}
        else:
            entry[col] = val
    return entry


def _jval(value):
    """Bungkus nilai untuk kolom JSONB memakai psycopg Json."""
    from psycopg.types.json import Json

    return Json(value)


def _upsert(conn, entry: dict) -> None:
    row = _entry_to_row(entry)
    conn.execute(
        f"""
        INSERT INTO {_TABLE}
            (id, display_name, filename, doc_name, chunks, metadata_indexed,
             category, domain, summary, topics, related, chunking, extra,
             uploaded_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (id) DO UPDATE SET
            display_name     = EXCLUDED.display_name,
            filename         = EXCLUDED.filename,
            doc_name         = EXCLUDED.doc_name,
            chunks           = EXCLUDED.chunks,
            metadata_indexed = EXCLUDED.metadata_indexed,
            category         = EXCLUDED.category,
            domain           = EXCLUDED.domain,
            summary          = EXCLUDED.summary,
            topics           = EXCLUDED.topics,
            related          = EXCLUDED.related,
            chunking         = EXCLUDED.chunking,
            extra            = EXCLUDED.extra,
            uploaded_at      = EXCLUDED.uploaded_at
        """,
        (
            row["id"],
            row["display_name"],
            row["filename"],
            row["doc_name"],
            row["chunks"],
            row["metadata_indexed"],
            row["category"],
            row["domain"],
            row["summary"],
            _jval(row["topics"]),
            _jval(row["related"]),
            _jval(row["chunking"]),
            _jval(row["extra"]),
            row["uploaded_at"],
        ),
    )


def _fetch_all(conn) -> list[dict]:
    cur = conn.execute(
        f"""
        SELECT id, display_name, filename, doc_name, chunks, metadata_indexed,
               category, domain, summary, topics, related, chunking, extra,
               uploaded_at
        FROM {_TABLE}
        """
    )
    cols = [d[0] for d in cur.description]
    return [_row_to_entry(dict(zip(cols, r))) for r in cur.fetchall()]


# ------------------------------ Migrasi sekali jalan ------------------------------


def _legacy_entries(conn) -> list[dict]:
    """Ambil data registry lama dari app_kv, lalu dari file JSON. [] kalau nihil."""
    # 1) app_kv key 'documents.json'
    try:
        row = conn.execute(
            f"SELECT value FROM {_KV_TABLE} WHERE key = %s", ("documents.json",)
        ).fetchone()
        if row and isinstance(row[0], list) and row[0]:
            return row[0]
    except Exception as exc:  # noqa: BLE001
        logger.info("Lewati migrasi dari app_kv (tabel belum ada?): %s", exc)
    # 2) file JSON lama
    if _LEGACY_FILE.exists():
        try:
            data = json.loads(_LEGACY_FILE.read_text(encoding="utf-8"))
            if isinstance(data, list):
                return data
        except (json.JSONDecodeError, OSError) as exc:
            logger.warning("Gagal baca %s untuk migrasi: %s", _LEGACY_FILE, exc)
    return []


def _ensure_migrated(conn) -> None:
    """Isi tabel `documents` dari sumber lama sekali, bila masih kosong."""
    global _migrated
    if _migrated:
        return
    count = conn.execute(f"SELECT COUNT(*) FROM {_TABLE}").fetchone()[0]
    if count and count > 0:
        _migrated = True
        return
    entries = _legacy_entries(conn)
    for entry in entries:
        if isinstance(entry, dict) and entry.get("id"):
            _upsert(conn, entry)
    if entries:
        logger.info(
            "Migrasi %d dokumen ke tabel '%s' berhasil.", len(entries), _TABLE
        )
    _migrated = True


# ------------------------------ API publik (tetap sama) ------------------------------


def list_docs() -> list[dict]:
    # terbaru di atas (urut string ISO uploaded_at, sama seperti versi lama)
    items = _run(_fetch_all)
    return sorted(items, key=lambda i: i.get("uploaded_at") or "", reverse=True)


def get_doc(doc_id: str) -> dict | None:
    def _op(conn):
        cur = conn.execute(
            f"""
            SELECT id, display_name, filename, doc_name, chunks, metadata_indexed,
                   category, domain, summary, topics, related, chunking, extra,
                   uploaded_at
            FROM {_TABLE} WHERE id = %s
            """,
            (doc_id,),
        )
        r = cur.fetchone()
        if not r:
            return None
        cols = [d[0] for d in cur.description]
        return _row_to_entry(dict(zip(cols, r)))

    return _run(_op)


def add_doc(entry: dict) -> dict:
    _run(lambda conn: _upsert(conn, entry))
    return entry


def remove_doc(doc_id: str) -> dict | None:
    target = get_doc(doc_id)

    def _op(conn):
        conn.execute(f"DELETE FROM {_TABLE} WHERE id = %s", (doc_id,))

    if target:
        _run(_op)
    return target
