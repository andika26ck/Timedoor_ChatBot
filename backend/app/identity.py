"""Verifikasi token identitas user dari CMS (JWT HS256, stdlib).

CMS menandatangani JWT berisi identitas user yang sedang login (user_id, nama,
email) memakai secret BERSAMA (IDENTITY_JWT_SECRET). Cobee memverifikasi tanda
tangan + masa berlaku, lalu menyimpan identitas itu di log percakapan.

Kalau token tidak ada / tidak valid / kedaluwarsa -> fallback ANONIM (chat TIDAK
ditolak), supaya widget publik tanpa login tetap jalan seperti sebelumnya.

Tidak menambah dependensi (pakai hmac + hashlib), mengikuti pola app/auth.py.

Kontrak token (yang harus dibuat sisi CMS):
  header : {"alg": "HS256", "typ": "JWT"}
  payload: {
    "sub":   "<user_id>",          # WAJIB (boleh pakai "user_id")
    "name":  "<nama user>",        # opsional (boleh pakai "user_name")
    "email": "<email user>",       # opsional (boleh pakai "user_email")
    "source":"cms",               # opsional, penanda asal
    "iat":   <unix time>,          # disarankan
    "exp":   <unix time>           # WAJIB & pendek (mis. 15-60 menit)
  }
  signature: HMAC-SHA256(base64url(header)+"."+base64url(payload), SECRET)
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import logging
import time

from app.config import settings

logger = logging.getLogger("faq-bot")

_ALG = "HS256"


def _secret() -> str:
    return (settings.identity_jwt_secret or "").strip()


def _b64d(data: str) -> bytes:
    pad = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + pad)


def _sign(signing_input: bytes, secret: str) -> str:
    sig = hmac.new(secret.encode("utf-8"), signing_input, hashlib.sha256).digest()
    return base64.urlsafe_b64encode(sig).rstrip(b"=").decode("ascii")


def verify_user_token(token: str | None) -> dict | None:
    """Verifikasi JWT identitas dari CMS. Return dict identitas atau None.

    Return None (fallback anonim) bila: token kosong, secret belum diset,
    format salah, tanda tangan tidak cocok, algoritma tak didukung, tidak ada
    user_id, atau sudah kedaluwarsa.
    """
    tok = (token or "").strip()
    if not tok:
        return None

    secret = _secret()
    if not secret:
        # Secret belum dikonfigurasi -> tidak bisa memverifikasi -> anonim.
        logger.warning(
            "IDENTITY_JWT_SECRET belum diisi; token identitas diabaikan (anonim)."
        )
        return None

    parts = tok.split(".")
    if len(parts) != 3:
        return None
    h_b64, p_b64, sig_b64 = parts

    # Verifikasi tanda tangan (konstan-waktu untuk cegah timing attack).
    signing_input = f"{h_b64}.{p_b64}".encode("ascii")
    expected = _sign(signing_input, secret)
    if not hmac.compare_digest(expected, sig_b64):
        return None

    # Pastikan algoritma sesuai (cegah trik alg=none).
    try:
        header = json.loads(_b64d(h_b64))
        if str(header.get("alg", "")).upper() != _ALG:
            return None
        payload = json.loads(_b64d(p_b64))
    except Exception:  # noqa: BLE001
        return None

    # Masa berlaku WAJIB dan tidak boleh lewat.
    exp = payload.get("exp")
    if exp is None:
        return None
    try:
        if int(exp) < int(time.time()):
            return None
    except (TypeError, ValueError):
        return None

    user_id = str(payload.get("sub") or payload.get("user_id") or "").strip()
    if not user_id:
        return None
    name = str(payload.get("name") or payload.get("user_name") or "").strip()
    email = str(payload.get("email") or payload.get("user_email") or "").strip()
    source = str(payload.get("source") or "cms").strip()

    return {
        "user_id": user_id,
        "user_name": name or None,
        "user_email": email or None,
        "source": source or None,
    }
