"""Manajemen akun admin (autentikasi) — tabel PostgreSQL `app_users`.

Login panel admin memakai username + password yang di-hash dengan
PBKDF2-SHA256 (stdlib Python, TANPA dependensi tambahan). Data disimpan di
database yang sama dengan registry dokumen (RAG_PG_DSN).

Antarmuka publik:
    get_user(username)      -> dict | None (termasuk password_hash)
    list_users()            -> list[dict] (tanpa password_hash)
    count_users()           -> int
    create_user(u, p, role) -> dict (upsert: buat baru / ganti password)
    set_password(u, p)      -> bool
    delete_user(u)          -> bool
    authenticate(u, p)      -> dict | None ({username, role})
    ensure_seed_admin()     -> None (buat admin pertama dari env bila kosong)
"""
from __future__ import annotations

import hashlib
import hmac
import logging
import os
import re
import threading
from datetime import datetime, timezone

logger = logging.getLogger("faq-bot")

# Nama tabel akun admin. Sengaja bukan "users" agar tidak bentrok dengan
# kata yang kadang dianggap khusus dan agar jelas ini milik aplikasi.
_TABLE = os.getenv("AUTH_USERS_TABLE", "app_users")

_PBKDF2_ITERS = 200_000

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

# Satu koneksi dipakai bersama, dijaga lock (FastAPI menjalankan endpoint
# sinkron di threadpool; koneksi psycopg tidak aman dipakai lintas thread).
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
            username      TEXT PRIMARY KEY,
            password_hash TEXT NOT NULL,
            role          TEXT NOT NULL DEFAULT 'admin',
            created_at    TEXT
        )
        """
    )
    conn.execute(f"ALTER TABLE {_TABLE} ADD COLUMN IF NOT EXISTS name TEXT")
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
            logger.warning("Koneksi users bermasalah, mencoba ulang: %s", exc)
            try:
                if _conn is not None:
                    _conn.close()
            except Exception:  # noqa: BLE001
                pass
            _conn = None
            return op(_get_conn())


# ------------------------------ Password hashing ------------------------------


def hash_password(password: str) -> str:
    """Hash password -> 'pbkdf2_sha256$iter$salt_hex$hash_hex'."""
    if not password:
        raise ValueError("Password tidak boleh kosong.")
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, _PBKDF2_ITERS)
    return f"pbkdf2_sha256${_PBKDF2_ITERS}${salt.hex()}${dk.hex()}"


def verify_password(password: str, stored: str) -> bool:
    """Cek password terhadap hash tersimpan (aman dari timing attack)."""
    try:
        algo, iters_s, salt_hex, hash_hex = (stored or "").split("$")
        if algo != "pbkdf2_sha256":
            return False
        iters = int(iters_s)
        salt = bytes.fromhex(salt_hex)
        expected = bytes.fromhex(hash_hex)
    except (ValueError, TypeError):
        return False
    dk = hashlib.pbkdf2_hmac("sha256", (password or "").encode("utf-8"), salt, iters)
    return hmac.compare_digest(dk, expected)


# ------------------------------ CRUD ------------------------------


def _norm(username: str) -> str:
    return (username or "").strip().lower()


def get_user(username: str) -> dict | None:
    """Ambil satu user (TERMASUK password_hash) untuk verifikasi login."""
    uname = _norm(username)
    if not uname:
        return None

    def op(conn):
        cur = conn.execute(
            f"SELECT username, password_hash, role, created_at, name "
            f"FROM {_TABLE} WHERE username = %s",
            (uname,),
        )
        return cur.fetchone()

    row = _run(op)
    if not row:
        return None
    return {
        "username": row[0],
        "password_hash": row[1],
        "role": row[2],
        "created_at": row[3],
        "name": row[4],
    }


def list_users() -> list[dict]:
    """Daftar user TANPA password_hash."""

    def op(conn):
        cur = conn.execute(
            f"SELECT username, role, created_at, name FROM {_TABLE} ORDER BY username"
        )
        return cur.fetchall()

    return [
        {"username": r[0], "role": r[1], "created_at": r[2], "name": r[3]}
        for r in _run(op)
    ]


def count_users() -> int:
    def op(conn):
        cur = conn.execute(f"SELECT COUNT(*) FROM {_TABLE}")
        return cur.fetchone()[0]

    return int(_run(op))


def create_user(
    username: str, password: str, role: str = "admin", name: str | None = None
) -> dict:
    """Buat user baru. Jika username sudah ada, password & role diperbarui."""
    uname = _norm(username)
    if not uname:
        raise ValueError("Username tidak boleh kosong.")
    if len(password or "") < 6:
        raise ValueError("Password minimal 6 karakter.")
    role = (role or "admin").strip() or "admin"
    name = (name or "").strip() or None
    pwd_hash = hash_password(password)
    created = datetime.now(timezone.utc).isoformat()

    def op(conn):
        conn.execute(
            f"""INSERT INTO {_TABLE} (username, password_hash, role, created_at, name)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (username) DO UPDATE
                  SET password_hash = EXCLUDED.password_hash,
                      role = EXCLUDED.role,
                      name = EXCLUDED.name""",
            (uname, pwd_hash, role, created, name),
        )

    _run(op)
    return {"username": uname, "role": role, "created_at": created, "name": name}


def register_user(email: str, password: str, name: str | None = None) -> dict:
    """Registrasi mandiri end-user (role='user').

    Berbeda dari create_user: TIDAK menimpa akun yang sudah ada. Bila email
    sudah terdaftar, lempar ValueError. Email dipakai sebagai username.
    """
    uname = _norm(email)
    if not uname or not _EMAIL_RE.match(uname):
        raise ValueError("Email tidak valid.")
    if len(password or "") < 6:
        raise ValueError("Password minimal 6 karakter.")
    display = (name or "").strip() or None
    pwd_hash = hash_password(password)
    created = datetime.now(timezone.utc).isoformat()

    def op(conn):
        cur = conn.execute(
            f"""INSERT INTO {_TABLE} (username, password_hash, role, created_at, name)
                VALUES (%s, %s, 'user', %s, %s)
                ON CONFLICT (username) DO NOTHING""",
            (uname, pwd_hash, created, display),
        )
        return cur.rowcount

    if int(_run(op)) == 0:
        raise ValueError("Email sudah terdaftar. Silakan login.")
    return {"username": uname, "role": "user", "created_at": created, "name": display}


def set_password(username: str, password: str) -> bool:
    """Ganti password user yang sudah ada. False bila user tidak ditemukan."""
    uname = _norm(username)
    if len(password or "") < 6:
        raise ValueError("Password minimal 6 karakter.")
    pwd_hash = hash_password(password)

    def op(conn):
        cur = conn.execute(
            f"UPDATE {_TABLE} SET password_hash = %s WHERE username = %s",
            (pwd_hash, uname),
        )
        return cur.rowcount

    return int(_run(op)) > 0


def delete_user(username: str) -> bool:
    uname = _norm(username)

    def op(conn):
        cur = conn.execute(f"DELETE FROM {_TABLE} WHERE username = %s", (uname,))
        return cur.rowcount

    return int(_run(op)) > 0


def authenticate(username: str, password: str) -> dict | None:
    """Kembalikan {username, role} bila kredensial cocok, atau None."""
    user = get_user(username)
    if not user:
        # Tetap jalankan hash dummy agar waktu respons mirip (anti user-enum).
        verify_password(password or "", "pbkdf2_sha256$1$00$00")
        return None
    if not verify_password(password or "", user["password_hash"]):
        return None
    return {
        "username": user["username"],
        "role": user["role"],
        "name": user.get("name"),
    }


def ensure_seed_admin() -> None:
    """Buat admin pertama dari env (AUTH_SEED_ADMIN_*) bila tabel masih kosong."""
    from app.config import settings

    uname = _norm(settings.auth_seed_admin_username)
    pwd = settings.auth_seed_admin_password or ""
    if not uname or not pwd:
        return
    try:
        if count_users() == 0:
            create_user(uname, pwd, "admin")
            logger.info("Seed admin '%s' dibuat dari environment.", uname)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Gagal membuat seed admin: %s", exc)
