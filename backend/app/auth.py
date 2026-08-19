"""Token akses (JWT HS256) + helper otorisasi endpoint admin.

Pembuatan & verifikasi token memakai stdlib (hmac + hashlib), sehingga TIDAK
menambah dependensi baru. Cukup dan aman untuk otentikasi panel admin internal
selama AUTH_JWT_SECRET diisi dengan nilai acak yang dirahasiakan.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import logging
import time

from fastapi import HTTPException, Request

from app.config import settings

logger = logging.getLogger("faq-bot")

_ALG = "HS256"
_DEV_SECRET = "dev-insecure-secret-change-me"


def _secret() -> str:
    sec = (settings.auth_jwt_secret or "").strip()
    if not sec:
        logger.warning(
            "AUTH_JWT_SECRET belum diisi — memakai secret dev yang TIDAK aman. "
            "Set AUTH_JWT_SECRET di .env untuk produksi."
        )
        return _DEV_SECRET
    return sec


def _b64e(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def _b64d(data: str) -> bytes:
    pad = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + pad)


def _sign(signing_input: bytes) -> str:
    sig = hmac.new(_secret().encode("utf-8"), signing_input, hashlib.sha256).digest()
    return _b64e(sig)


def create_access_token(username: str, role: str = "admin") -> str:
    now = int(time.time())
    exp = now + int(settings.auth_token_expire_minutes) * 60
    header = {"alg": _ALG, "typ": "JWT"}
    payload = {"sub": username, "role": role, "iat": now, "exp": exp}
    h = _b64e(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    p = _b64e(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signing_input = f"{h}.{p}".encode("ascii")
    return f"{h}.{p}.{_sign(signing_input)}"


def decode_token(token: str) -> dict | None:
    """Verifikasi tanda tangan + kedaluwarsa. Kembalikan payload atau None."""
    try:
        h, p, s = token.split(".")
    except (ValueError, AttributeError):
        return None
    signing_input = f"{h}.{p}".encode("ascii")
    if not hmac.compare_digest(_sign(signing_input), s):
        return None
    try:
        payload = json.loads(_b64d(p))
    except (ValueError, TypeError):
        return None
    try:
        if int(payload.get("exp", 0)) < int(time.time()):
            return None
    except (TypeError, ValueError):
        return None
    return payload


def _extract_token(request: Request) -> str | None:
    header = request.headers.get("Authorization") or request.headers.get(
        "authorization"
    )
    if not header:
        return None
    parts = header.split(" ", 1)
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1].strip()
    return None


def current_user(request: Request) -> dict | None:
    """Ambil user dari header Authorization bila token valid, atau None."""
    token = _extract_token(request)
    if not token:
        return None
    payload = decode_token(token)
    if not payload:
        return None
    return {"username": payload.get("sub"), "role": payload.get("role", "admin")}


def require_admin(request: Request) -> dict:
    """Dependency FastAPI: 401 bila tidak ada sesi admin yang valid."""
    user = current_user(request)
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Sesi tidak valid atau kedaluwarsa. Silakan login lagi.",
        )
    return user
