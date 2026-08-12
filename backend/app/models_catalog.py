"""Daftar model Gemini yang bisa dipakai, diambil langsung dari API.

client.models.list() mengembalikan puluhan model, termasuk model gambar, TTS,
video, audio, dan embedding. Di sini kita saring supaya UI hanya menampilkan
model teks yang masuk akal untuk menjawab pertanyaan.

CATATAN PENTING: muncul di daftar TIDAK berarti model bisa dipakai. Project
baru sering menerima 404 "no longer available to new users" untuk model
generasi 2.x walaupun model itu tetap terdaftar. Model semacam itu diberi
tanda `warn` supaya UI bisa memperingatkan sebelum user memilihnya.
"""
import logging
import time

from app.store import client

logger = logging.getLogger("faq-bot")

_CACHE_TTL = 600  # detik; daftar model jarang berubah
_cache: dict = {"at": 0.0, "items": []}

# Potongan nama yang menandakan model non-teks / tidak cocok untuk tanya-jawab.
_EXCLUDE = (
    "image",
    "nano-banana",
    "tts",
    "audio",
    "veo",
    "imagen",
    "lyria",
    "robotics",
    "embedding",
    "computer-use",
    "deep-research",
    "antigravity",
    "live",
    "aqa",
)

# Model yang sering ditolak project baru (404), atau tidak mendukung File
# Search / system_instruction seperti Gemma.
_RISKY_PREFIX = ("gemini-1.", "gemini-2.", "gemma")


def _usable(name: str, actions) -> bool:
    if "generateContent" not in (actions or []):
        return False
    low = name.lower()
    return not any(x in low for x in _EXCLUDE)


def list_text_models(force: bool = False) -> list[dict]:
    """Model teks yang tersedia, terurut: yang aman dulu, lalu yang berisiko."""
    now = time.time()
    if not force and _cache["items"] and now - _cache["at"] < _CACHE_TTL:
        return _cache["items"]

    items: list[dict] = []
    for m in client.models.list():
        name = str(getattr(m, "name", "") or "").replace("models/", "")
        if not name:
            continue
        if not _usable(name, getattr(m, "supported_actions", None)):
            continue
        items.append(
            {
                "name": name,
                "display_name": str(getattr(m, "display_name", "") or name),
                "warn": name.startswith(_RISKY_PREFIX),
            }
        )

    items.sort(key=lambda x: (x["warn"], x["name"]))
    _cache.update({"at": now, "items": items})
    logger.info("Daftar model dimuat: %d model teks.", len(items))
    return items
