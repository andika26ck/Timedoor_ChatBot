"""Log percakapan chatbot untuk tracking sisi admin (tabel PostgreSQL).

Menyimpan tiap giliran chat (pertanyaan user & jawaban bot) beserta session_id
anonim dan waktu, supaya admin bisa memantau: siapa saja (per sesi) yang
memakai chatbot, kapan, dan apa saja yang ditanyakan.

Identitas sengaja ANONIM: hanya session_id (dibuat di browser end-user) + waktu.
Tidak ada nama/email. Kalau nanti mau menyimpan identitas, tinggal tambah kolom.

Koneksi memakai DSN yang sama dengan vector store & registry (RAG_PG_DSN),
mengikuti pola app/registry.py: satu koneksi dipakai bersama, dijaga lock,
reconnect sekali bila putus.
"""
from __future__ import annotations

import logging
import os
import threading
import uuid

logger = logging.getLogger("faq-bot")

# Nama tabel log percakapan.
_TABLE = os.getenv("CHAT_LOGS_TABLE", "chat_logs")

# Satu koneksi dipakai bersama, dijaga lock (FastAPI jalankan endpoint sinkron
# di threadpool; koneksi psycopg tidak aman dipakai banyak thread sekaligus).
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
            id          TEXT PRIMARY KEY,
            session_id  TEXT NOT NULL,
            role        TEXT NOT NULL,
            text        TEXT NOT NULL,
            domain      TEXT,
            topic       TEXT,
            created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )
    conn.execute(
        f"CREATE INDEX IF NOT EXISTS {_TABLE}_session_idx "
        f"ON {_TABLE} (session_id, created_at)"
    )
    conn.execute(
        f"CREATE INDEX IF NOT EXISTS {_TABLE}_created_idx ON {_TABLE} (created_at)"
    )
    # Migrasi kolom identitas (sesi non-anonim). Nullable + IF NOT EXISTS,
    # sehingga aman dijalankan berulang dan tidak mengganggu baris lama.
    for _col in ("user_id", "user_name", "user_email", "source"):
        conn.execute(f"ALTER TABLE {_TABLE} ADD COLUMN IF NOT EXISTS {_col} TEXT")
    conn.execute(
        f"CREATE INDEX IF NOT EXISTS {_TABLE}_user_idx ON {_TABLE} (user_id)"
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
            logger.warning("Koneksi chatlog bermasalah, mencoba ulang: %s", exc)
            try:
                if _conn is not None:
                    _conn.close()
            except Exception:  # noqa: BLE001
                pass
            _conn = None
            return op(_get_conn())


def _iso(value) -> str:
    if value is None:
        return ""
    try:
        return value.isoformat()
    except AttributeError:
        return str(value)


# ------------------------------ Tulis ------------------------------


def log_message(
    session_id: str,
    role: str,
    text: str,
    domain: str | None = None,
    topic: str | None = None,
    user_id: str | None = None,
    user_name: str | None = None,
    user_email: str | None = None,
    source: str | None = None,
) -> None:
    """Catat satu giliran chat. BEST-EFFORT: kegagalan TIDAK mengganggu chat.

    user_id/user_name/user_email/source terisi bila user login lewat CMS
    (token identitas valid). Kosong = percakapan anonim (perilaku lama).
    """
    sid = (session_id or "").strip() or "anon"
    role = (role or "").strip().lower()
    body = (text or "").strip()
    if role not in ("user", "assistant") or not body:
        return

    def op(conn):
        conn.execute(
            f"""
            INSERT INTO {_TABLE}
                (id, session_id, role, text, domain, topic,
                 user_id, user_name, user_email, source)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                uuid.uuid4().hex,
                sid,
                role,
                body,
                (domain or "").strip() or None,
                (topic or "").strip() or None,
                (user_id or "").strip() or None,
                (user_name or "").strip() or None,
                (user_email or "").strip() or None,
                (source or "").strip() or None,
            ),
        )

    try:
        _run(op)
    except Exception:  # noqa: BLE001
        logger.exception("Gagal mencatat log chat (diabaikan)")


# ------------------------------ Baca ------------------------------


def list_sessions(
    limit: int = 100,
    offset: int = 0,
    since: str | None = None,
    until: str | None = None,
) -> list[dict]:
    """Ringkasan per sesi, sesi paling baru dulu (tabel Riwayat Pengguna).

    since/until: filter waktu ISO opsional (mis. "2026-08-01").
    """
    lim = max(1, min(int(limit or 100), 500))
    off = max(0, int(offset or 0))
    where: list[str] = []
    params: list = []
    if since:
        where.append("created_at >= %s")
        params.append(since)
    if until:
        where.append("created_at <= %s")
        params.append(until)
    clause = ("WHERE " + " AND ".join(where)) if where else ""

    def op(conn):
        cur = conn.execute(
            f"""
            SELECT
                session_id,
                COUNT(*)                               AS messages,
                COUNT(*) FILTER (WHERE role = 'user')  AS questions,
                MIN(created_at)                        AS first_at,
                MAX(created_at)                        AS last_at,
                (ARRAY_AGG(text ORDER BY created_at)
                    FILTER (WHERE role = 'user'))[1]   AS first_question,
                (ARRAY_AGG(user_name ORDER BY created_at DESC)
                    FILTER (WHERE user_name IS NOT NULL))[1]  AS user_name,
                (ARRAY_AGG(user_email ORDER BY created_at DESC)
                    FILTER (WHERE user_email IS NOT NULL))[1] AS user_email,
                (ARRAY_AGG(user_id ORDER BY created_at DESC)
                    FILTER (WHERE user_id IS NOT NULL))[1]    AS user_id
            FROM {_TABLE}
            {clause}
            GROUP BY session_id
            ORDER BY last_at DESC
            LIMIT %s OFFSET %s
            """,
            (*params, lim, off),
        )
        rows = cur.fetchall()
        cols = [d[0] for d in cur.description]
        out: list[dict] = []
        for r in rows:
            d = dict(zip(cols, r))
            out.append(
                {
                    "session_id": d.get("session_id") or "",
                    "messages": int(d.get("messages") or 0),
                    "questions": int(d.get("questions") or 0),
                    "first_at": _iso(d.get("first_at")),
                    "last_at": _iso(d.get("last_at")),
                    "first_question": d.get("first_question") or "",
                    "user_id": d.get("user_id") or "",
                    "user_name": d.get("user_name") or "",
                    "user_email": d.get("user_email") or "",
                }
            )
        return out

    return _run(op)


def get_session(session_id: str) -> list[dict]:
    """Semua pesan dalam satu sesi, urut waktu naik."""
    sid = (session_id or "").strip()
    if not sid:
        return []

    def op(conn):
        cur = conn.execute(
            f"""
            SELECT role, text, domain, topic, created_at
            FROM {_TABLE}
            WHERE session_id = %s
            ORDER BY created_at ASC
            """,
            (sid,),
        )
        out: list[dict] = []
        for role, text, domain, topic, created_at in cur.fetchall():
            out.append(
                {
                    "role": role,
                    "text": text,
                    "domain": domain or "",
                    "topic": topic or "",
                    "created_at": _iso(created_at),
                }
            )
        return out

    return _run(op)


def last_activity_by_user() -> dict[str, str]:
    """Map user_id -> ISO waktu chat terakhir (untuk kolom 'Terakhir aktif').

    Hanya baris dengan user_id terisi (sesi login) yang dihitung, sehingga
    admin bisa melihat kapan tiap akun terakhir mengirim pertanyaan.
    """

    def op(conn):
        cur = conn.execute(
            f"""
            SELECT user_id, MAX(created_at) AS last_at
            FROM {_TABLE}
            WHERE user_id IS NOT NULL AND user_id <> ''
            GROUP BY user_id
            """
        )
        return {r[0]: _iso(r[1]) for r in cur.fetchall()}

    return _run(op)


# ------------------------------ Hapus / Retensi ------------------------------


def delete_session(session_id: str) -> int:
    """Hapus permanen satu sesi (semua pesannya). Kembalikan jumlah baris."""
    sid = (session_id or "").strip()
    if not sid:
        return 0

    def op(conn):
        cur = conn.execute(f"DELETE FROM {_TABLE} WHERE session_id = %s", (sid,))
        return cur.rowcount

    return int(_run(op))


def purge_old(days: int = 60) -> int:
    """Hapus permanen percakapan yang lebih tua dari `days` hari (retensi).

    Dipanggil best-effort tiap kali daftar sesi dimuat, sehingga data lama
    otomatis hilang tanpa perlu penjadwal terpisah.
    """
    days = max(1, int(days or 60))

    def op(conn):
        cur = conn.execute(
            f"DELETE FROM {_TABLE} "
            f"WHERE created_at < now() - make_interval(days => %s)",
            (days,),
        )
        return cur.rowcount

    try:
        return int(_run(op))
    except Exception:  # noqa: BLE001
        logger.warning("Gagal menjalankan retensi chat_logs (%s hari)", days)
        return 0
