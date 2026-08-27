"""Manajemen API key untuk konsumsi API dari luar (widget/CMS) - tabel `api_keys`.

Tiap konsumen (mis. CMS, sistem lain) bisa punya key sendiri yang dapat dicabut
tanpa mengganggu yang lain. Key TIDAK disimpan dalam bentuk asli; yang disimpan
hanya SHA-256-nya (key acak berentropi tinggi, jadi sha256 sudah memadai).
Nilai asli hanya ditampilkan SEKALI saat pembuatan.

Koneksi memakai DSN yang sama dengan vector store (RAG_PG_DSN), meniru pola
app/users.py (satu koneksi dijaga lock, reconnect sekali bila putus).

Antarmuka publik:
    generate_token()                 -> str  (key baru, format 'tdk_<acak>')
    hash_token(token)                -> str  (sha256 hex)
    create_key(name, rate, by)       -> dict (berisi 'token' asli, sekali saja)
    list_keys()                      -> list[dict] (tanpa hash/plaintext)
    verify_token(token)              -> dict | None ({name, rate_limit_per_min})
    revoke_key(name) / activate_key  -> bool
    delete_key(name)                 -> bool
    count_active()                   -> int
"""
from __future__ import annotations

import hashlib
import logging
import os
import secrets
import threading
from datetime import datetime, timezone

logger = logging.getLogger("faq-bot")

_TABLE = os.getenv("API_KEYS_TABLE", "api_keys")
_TOKEN_PREFIX = "tdk_"

_DB_LOCK = threading.Lock()
_conn = None


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
            id                 BIGSERIAL PRIMARY KEY,
            name               TEXT UNIQUE NOT NULL,
            token_prefix       TEXT NOT NULL,
            token_hash         TEXT NOT NULL,
            active             BOOLEAN NOT NULL DEFAULT TRUE,
            rate_limit_per_min INTEGER,
            created_at         TEXT,
            created_by         TEXT,
            last_used_at       TEXT
        )
        """
    )
    conn.execute(
        f"CREATE INDEX IF NOT EXISTS {_TABLE}_token_hash_idx ON {_TABLE} (token_hash)"
    )
    # Migrasi: tambah kolom channel untuk tabel yang sudah ada sebelum fitur ini.
    conn.execute(f"ALTER TABLE {_TABLE} ADD COLUMN IF NOT EXISTS channel TEXT")
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
            return op(_get_conn())
        except Exception as exc:  # noqa: BLE001
            logger.warning("Koneksi api_keys bermasalah, mencoba ulang: %s", exc)
            try:
                if _conn is not None:
                    _conn.close()
            except Exception:  # noqa: BLE001
                pass
            _conn = None
            return op(_get_conn())


def _norm(name: str) -> str:
    return (name or "").strip().lower()


# Nilai channel yang sah untuk penanda asal percakapan.
_VALID_CHANNELS = {"web", "cms", "embed"}


def _norm_channel(channel):
    ch = (channel or "").strip().lower()
    return ch if ch in _VALID_CHANNELS else None


def generate_token() -> str:
    return _TOKEN_PREFIX + secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    return hashlib.sha256((token or "").encode("utf-8")).hexdigest()


def create_key(
    name: str, rate_limit_per_min=None, created_by: str = "", channel=None
) -> dict:
    """Buat API key baru. Return dict berisi 'token' ASLI (tampil sekali saja)."""
    nm = _norm(name)
    if not nm:
        raise ValueError("Nama konsumen tidak boleh kosong.")
    ch = _norm_channel(channel)
    token = generate_token()
    token_hash = hash_token(token)
    prefix = token[: len(_TOKEN_PREFIX) + 6]
    rate = int(rate_limit_per_min) if rate_limit_per_min else None
    created = datetime.now(timezone.utc).isoformat(timespec="seconds")

    def op(conn):
        cur = conn.execute(
            f"""INSERT INTO {_TABLE}
                  (name, token_prefix, token_hash, active, rate_limit_per_min,
                   created_at, created_by, channel)
                VALUES (%s, %s, %s, TRUE, %s, %s, %s, %s)
                ON CONFLICT (name) DO NOTHING""",
            (nm, prefix, token_hash, rate, created, (created_by or "").strip(), ch),
        )
        return cur.rowcount

    if not int(_run(op)):
        raise ValueError(
            f"Nama '{nm}' sudah dipakai. Pilih nama lain atau hapus key lama."
        )
    return {
        "name": nm,
        "token": token,
        "token_prefix": prefix,
        "rate_limit_per_min": rate,
        "created_at": created,
        "channel": ch,
    }


def list_keys() -> list[dict]:
    def op(conn):
        cur = conn.execute(
            f"""SELECT name, token_prefix, active, rate_limit_per_min,
                       created_at, created_by, last_used_at, channel
                FROM {_TABLE} ORDER BY name"""
        )
        return cur.fetchall()

    return [
        {
            "name": r[0],
            "token_prefix": r[1],
            "active": bool(r[2]),
            "rate_limit_per_min": r[3],
            "created_at": r[4],
            "created_by": r[5],
            "last_used_at": r[6],
            "channel": r[7],
        }
        for r in _run(op)
    ]


def verify_token(token: str) -> dict | None:
    """Kembalikan {name, rate_limit_per_min} bila key aktif & cocok, atau None."""
    token = (token or "").strip()
    if not token:
        return None
    th = hash_token(token)

    def op(conn):
        cur = conn.execute(
            f"""SELECT name, rate_limit_per_min, channel FROM {_TABLE}
                WHERE token_hash = %s AND active = TRUE""",
            (th,),
        )
        return cur.fetchone()

    row = _run(op)
    if not row:
        return None
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")

    def upd(conn):
        conn.execute(
            f"UPDATE {_TABLE} SET last_used_at = %s WHERE token_hash = %s",
            (now, th),
        )

    try:
        _run(upd)
    except Exception:  # noqa: BLE001
        pass
    return {"name": row[0], "rate_limit_per_min": row[1], "channel": row[2]}


def revoke_key(name: str) -> bool:
    nm = _norm(name)

    def op(conn):
        cur = conn.execute(f"UPDATE {_TABLE} SET active = FALSE WHERE name = %s", (nm,))
        return cur.rowcount

    return int(_run(op)) > 0


def activate_key(name: str) -> bool:
    nm = _norm(name)

    def op(conn):
        cur = conn.execute(f"UPDATE {_TABLE} SET active = TRUE WHERE name = %s", (nm,))
        return cur.rowcount

    return int(_run(op)) > 0


def delete_key(name: str) -> bool:
    nm = _norm(name)

    def op(conn):
        cur = conn.execute(f"DELETE FROM {_TABLE} WHERE name = %s", (nm,))
        return cur.rowcount

    return int(_run(op)) > 0


def count_active() -> int:
    def op(conn):
        cur = conn.execute(f"SELECT COUNT(*) FROM {_TABLE} WHERE active = TRUE")
        return cur.fetchone()[0]

    return int(_run(op))
