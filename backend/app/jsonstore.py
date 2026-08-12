"""Key-Value store berbasis PostgreSQL (pengganti file JSON).

VERSI POSTGRES
--------------
Dulu tiap \"store\" (documents.json, app_settings.json, stats.json,
feedback.json, templates.json) disimpan sebagai file JSON di disk. Sekarang
SEMUANYA disimpan di satu tabel Postgres `app_kv` (key = nama store, value =
JSONB). Tidak ada lagi penyimpanan JSON di file.

Antarmuka publik `JsonStore` DIPERTAHANKAN sama persis (`read`, `write`,
`lock`) sehingga registry, settings_store, stats_store, feedback_store, dan
templates_store TIDAK perlu diubah.

Migrasi otomatis:
- Saat sebuah key dibaca pertama kali dan belum ada di Postgres, tapi file JSON
  lama masih ada di disk, isinya otomatis dipindahkan ke Postgres (sekali),
  lalu dipakai dari Postgres seterusnya. Jadi data lama (mis. 38 dokumen di
  documents.json) tidak hilang tanpa langkah manual.
- File JSON lama dibiarkan di disk sebagai cadangan; setelah termigrasi, file
  itu tidak dibaca lagi.

Koneksi database memakai DSN yang sama dengan vector store (engine config:
RAG_PG_DSN). Tabel dibuat otomatis bila belum ada.
"""
from __future__ import annotations

import copy
import json
import logging
import os
import threading
from pathlib import Path

logger = logging.getLogger("faq-bot")

# Lokasi file JSON LAMA (hanya untuk sumber migrasi sekali jalan).
_BASE_DIR = Path(os.getenv("STATE_DIR") or Path(__file__).resolve().parent.parent)
_BASE_DIR.mkdir(parents=True, exist_ok=True)

# Nama tabel key-value di Postgres.
_KV_TABLE = os.getenv("APP_KV_TABLE", "app_kv")

# Satu koneksi dipakai bersama, dijaga dengan lock supaya aman dari akses
# beberapa thread (FastAPI menjalankan endpoint sinkron di threadpool).
_DB_LOCK = threading.Lock()
_conn = None

# Penanda \"tidak ada nilai\" (beda dari None yang merupakan nilai sah).
_MISSING = object()


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
        CREATE TABLE IF NOT EXISTS {_KV_TABLE} (
            key        TEXT PRIMARY KEY,
            value      JSONB NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
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
    """Jalankan `op(conn)` dengan aman: serialisasi + reconnect sekali bila putus."""
    global _conn
    with _DB_LOCK:
        try:
            return op(_get_conn())
        except Exception as exc:  # noqa: BLE001
            logger.warning("Koneksi app_kv bermasalah, mencoba ulang: %s", exc)
            try:
                if _conn is not None:
                    _conn.close()
            except Exception:  # noqa: BLE001
                pass
            _conn = None
            return op(_get_conn())


class JsonStore:
    """Antarmuka lama, penyimpanan baru (Postgres app_kv).

    - key      : nama store (dulu nama file, mis. \"documents.json\").
    - default  : nilai default bila key belum ada dan tidak ada file lama.
    """

    def __init__(self, filename: str, default):
        self._key = filename
        self._path = _BASE_DIR / filename  # sumber migrasi lama saja
        self._default = default
        self._lock = threading.Lock()

    @property
    def lock(self) -> threading.Lock:
        return self._lock

    def read(self):
        def _op(conn):
            return conn.execute(
                f"SELECT value FROM {_KV_TABLE} WHERE key = %s", (self._key,)
            ).fetchone()

        row = _run(_op)
        if row is not None:
            return row[0]

        # Belum ada di Postgres -> coba migrasi dari file JSON lama (sekali).
        migrated = self._migrate_legacy_file()
        if migrated is not _MISSING:
            return migrated

        return copy.deepcopy(self._default)

    def write(self, data) -> None:
        from psycopg.types.json import Json

        def _op(conn):
            conn.execute(
                f"""
                INSERT INTO {_KV_TABLE} (key, value, updated_at)
                VALUES (%s, %s, now())
                ON CONFLICT (key) DO UPDATE SET
                    value = EXCLUDED.value,
                    updated_at = now()
                """,
                (self._key, Json(data)),
            )

        _run(_op)

    def _migrate_legacy_file(self):
        """Pindahkan isi file JSON lama ke Postgres sekali. Return data atau _MISSING."""
        if not self._path.exists():
            return _MISSING
        try:
            data = json.loads(self._path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError) as exc:
            logger.warning("Gagal baca file lama %s untuk migrasi: %s", self._path, exc)
            return _MISSING
        try:
            self.write(data)
            logger.info(
                "Migrasi '%s' dari file JSON lama ke Postgres (app_kv) berhasil.",
                self._key,
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("Gagal migrasi '%s' ke Postgres: %s", self._key, exc)
            return _MISSING
        return data
