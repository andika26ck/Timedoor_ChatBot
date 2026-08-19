"""Audit log — catat siapa melakukan apa (upload/edit/hapus/setelan).

Tabel `audit_log` di PostgreSQL (DSN sama dengan vector store & registry).
Dipakai halaman "Log Aktivitas" di dashboard admin supaya setiap perubahan
knowledge base bisa ditelusuri: siapa pelakunya, kapan, dan objek apa yang
diubah.

Pencatatan bersifat BEST-EFFORT: kegagalan menulis log TIDAK boleh menggagalkan
aksi utamanya (upload dokumen tetap sukses walau baris log gagal ditulis).

Koneksi database memakai DSN yang sama dengan vector store (RAG_PG_DSN), pola
koneksinya meniru app/registry.py (satu koneksi dijaga lock, reconnect sekali
bila putus).
"""
from __future__ import annotations

import logging
import os
import threading
from datetime import datetime, timezone

logger = logging.getLogger("faq-bot")

# Nama tabel log aktivitas (bisa dioverride lewat environment).
_TABLE = os.getenv("AUDIT_LOG_TABLE", "audit_log")

# Satu koneksi dipakai bersama, dijaga lock (psycopg tidak aman dipakai banyak
# thread sekaligus; FastAPI menjalankan endpoint sinkron di threadpool).
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
            id        BIGSERIAL PRIMARY KEY,
            ts        TEXT,
            username  TEXT,
            action    TEXT,
            target    TEXT,
            target_id TEXT,
            details   JSONB NOT NULL DEFAULT '{{}}'
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
            return op(_get_conn())
        except Exception as exc:  # noqa: BLE001
            logger.warning("Koneksi audit bermasalah, mencoba ulang: %s", exc)
            try:
                if _conn is not None:
                    _conn.close()
            except Exception:  # noqa: BLE001
                pass
            _conn = None
            return op(_get_conn())


def _jval(value):
    """Bungkus nilai untuk kolom JSONB memakai psycopg Json."""
    from psycopg.types.json import Json

    return Json(value or {})


# ------------------------------ API publik ------------------------------


def record(
    username: str,
    action: str,
    target: str | None = None,
    target_id: str | None = None,
    details: dict | None = None,
) -> None:
    """Catat satu aksi admin. Best-effort: TIDAK pernah melempar error.

    action memakai konvensi "<objek>.<aksi>", mis. "document.create",
    "document.update", "document.delete", "kb.reset", "settings.update".
    """
    ts = datetime.now(timezone.utc).isoformat(timespec="seconds")
    uname = (username or "").strip() or "(tak dikenal)"

    def _op(conn):
        conn.execute(
            f"""
            INSERT INTO {_TABLE} (ts, username, action, target, target_id, details)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (ts, uname, action or "", target, target_id, _jval(details)),
        )

    try:
        _run(_op)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Gagal mencatat audit log (%s): %s", action, exc)


def list_events(
    limit: int = 200,
    offset: int = 0,
    since: str | None = None,
    until: str | None = None,
    action: str | None = None,
    username: str | None = None,
) -> list[dict]:
    """Daftar aksi terbaru (terbaru di atas) dengan filter opsional."""
    limit = max(1, min(int(limit or 200), 1000))
    offset = max(0, int(offset or 0))

    where: list[str] = []
    params: list = []
    if since:
        where.append("ts >= %s")
        params.append(since)
    if until:
        where.append("ts <= %s")
        params.append(until)
    if action:
        where.append("action = %s")
        params.append(action)
    if username:
        where.append("username = %s")
        params.append(username)
    clause = (" WHERE " + " AND ".join(where)) if where else ""

    def _op(conn):
        cur = conn.execute(
            f"""
            SELECT id, ts, username, action, target, target_id, details
            FROM {_TABLE}{clause}
            ORDER BY id DESC
            LIMIT %s OFFSET %s
            """,
            (*params, limit, offset),
        )
        cols = [d[0] for d in cur.description]
        out: list[dict] = []
        for r in cur.fetchall():
            row = dict(zip(cols, r))
            out.append(
                {
                    "id": row.get("id") or 0,
                    "ts": row.get("ts") or "",
                    "username": row.get("username") or "",
                    "action": row.get("action") or "",
                    "target": row.get("target") or "",
                    "target_id": row.get("target_id") or "",
                    "details": row.get("details") or {},
                }
            )
        return out

    return _run(_op)
