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
    exclude_api: bool = False,
) -> list[dict]:
    """Daftar aksi terbaru (terbaru di atas) dengan filter opsional.

    exclude_api=True menyembunyikan baris pemakaian API (action "api.*") supaya
    tab "Aktivitas Admin" hanya berisi aksi yang mengubah knowledge base.
    """
    limit = max(1, min(int(limit or 200), 1000))
    offset = max(0, int(offset or 0))

    where: list[str] = []
    params: list = []
    if exclude_api:
        where.append("action NOT LIKE 'api.%%'")
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


# ----------------------- Penggunaan API (per konsumen) -----------------------
#
# Baris pemakaian API dicatat oleh main._audit_api_usage() dengan action
# "api.ask"/"api.ask_stream" dan username "api:<konsumen>". Fungsi di bawah ini
# meng-agregasi baris tersebut untuk tab "Penggunaan API" (terpisah dari log
# aktivitas admin) supaya mudah dibaca: ringkasan angka, tren harian, dan tabel.


def _api_where(consumer=None, since=None, until=None):
    """Bangun klausa WHERE untuk baris pemakaian API (action LIKE 'api.%').

    Catatan psycopg: karena selalu ada parameter yang dikirim, tanda persen
    literal harus ditulis ganda ('api.%%') agar tidak dianggap placeholder.
    """
    where = ["action LIKE 'api.%%'"]
    params: list = []
    if consumer:
        where.append("username = %s")
        params.append(f"api:{consumer}")
    if since:
        where.append("ts >= %s")
        params.append(since)
    if until:
        where.append("ts <= %s")
        params.append(until)
    return " WHERE " + " AND ".join(where), params


def _consumer_name(username: str) -> str:
    u = username or ""
    return u[4:] if u.startswith("api:") else u


def list_api_usage(
    limit: int = 50,
    offset: int = 0,
    consumer: str | None = None,
    since: str | None = None,
    until: str | None = None,
) -> list[dict]:
    """Daftar baris pemakaian API (terbaru di atas) dengan filter opsional."""
    limit = max(1, min(int(limit or 50), 1000))
    offset = max(0, int(offset or 0))
    clause, params = _api_where(consumer, since, until)

    def _op(conn):
        cur = conn.execute(
            f"""
            SELECT id, ts, username, action, target, target_id
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
                    "consumer": _consumer_name(row.get("username") or ""),
                    "action": row.get("action") or "",
                    "endpoint": row.get("target") or "",
                    "session_id": row.get("target_id") or "",
                }
            )
        return out

    return _run(_op)


def count_api_usage(
    consumer: str | None = None,
    since: str | None = None,
    until: str | None = None,
) -> int:
    """Total baris pemakaian API sesuai filter (untuk pagination)."""
    clause, params = _api_where(consumer, since, until)

    def _op(conn):
        cur = conn.execute(
            f"SELECT COUNT(*) FROM {_TABLE}{clause}", tuple(params)
        )
        row = cur.fetchone()
        return int(row[0]) if row else 0

    return _run(_op)


def api_usage_summary(days: int = 14) -> dict:
    """Ringkasan pemakaian API: total, jendela waktu, per-konsumen, tren harian.

    Jendela waktu bersifat rolling (24 jam / 7 hari / 30 hari terakhir) dan tren
    harian dikelompokkan per tanggal UTC untuk `days` hari terakhir (0 diisi
    untuk hari tanpa aktivitas supaya grafik tidak bolong).
    """
    from datetime import datetime, timedelta, timezone

    days = max(1, min(int(days or 14), 90))
    now = datetime.now(timezone.utc)

    def _iso(dt) -> str:
        return dt.isoformat(timespec="seconds")

    d1 = _iso(now - timedelta(hours=24))
    d7 = _iso(now - timedelta(days=7))
    d30 = _iso(now - timedelta(days=30))
    # Awal rentang tren harian (mulai tengah malam UTC `days-1` hari lalu).
    start_day = (now - timedelta(days=days - 1)).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    since_days = _iso(start_day)

    def _op(conn):
        # Total keseluruhan + jendela waktu dalam satu query.
        cur = conn.execute(
            f"""
            SELECT
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE ts >= %s) AS d1,
                COUNT(*) FILTER (WHERE ts >= %s) AS d7,
                COUNT(*) FILTER (WHERE ts >= %s) AS d30
            FROM {_TABLE}
            WHERE action LIKE 'api.%%'
            """,
            (d1, d7, d30),
        )
        trow = cur.fetchone() or (0, 0, 0, 0)
        total, c1, c7, c30 = (int(x or 0) for x in trow)

        # Per-konsumen: total sepanjang waktu + 7 hari terakhir.
        cur = conn.execute(
            f"""
            SELECT username,
                   COUNT(*) AS total,
                   COUNT(*) FILTER (WHERE ts >= %s) AS d7
            FROM {_TABLE}
            WHERE action LIKE 'api.%%'
            GROUP BY username
            ORDER BY total DESC
            """,
            (d7,),
        )
        consumers = [
            {
                "consumer": _consumer_name(u or ""),
                "count": int(t or 0),
                "last_7d": int(s or 0),
            }
            for (u, t, s) in cur.fetchall()
        ]

        # Tren harian (per tanggal UTC).
        cur = conn.execute(
            f"""
            SELECT substr(ts, 1, 10) AS day, COUNT(*) AS n
            FROM {_TABLE}
            WHERE action LIKE 'api.%%' AND ts >= %s
            GROUP BY day
            """,
            (since_days,),
        )
        by_day = {str(d): int(n or 0) for (d, n) in cur.fetchall()}
        daily = []
        for i in range(days):
            day = (start_day + timedelta(days=i)).date().isoformat()
            daily.append({"date": day, "count": by_day.get(day, 0)})

        return {
            "total": total,
            "last_24h": c1,
            "last_7d": c7,
            "last_30d": c30,
            "consumers": consumers,
            "daily": daily,
        }

    return _run(_op)
