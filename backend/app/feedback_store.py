"""Umpan balik pengguna (feedback.json).

Setiap klik tombol suka / tidak suka pada sebuah jawaban dikirim frontend ke
endpoint POST /feedback lalu dicatat di sini. Berguna untuk memantau kualitas
jawaban bot dari waktu ke waktu.

Frontend memanggilnya secara fire-and-forget (kegagalan diabaikan), jadi
endpoint cukup menyimpan diam-diam lalu mengembalikan status singkat.
"""
from datetime import datetime, timezone

from app.jsonstore import JsonStore

_store = JsonStore("feedback.json", [])


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def record(
    message_id: str,
    value: str,
    question: str | None = None,
    answer: str | None = None,
) -> dict:
    """Catat satu umpan balik dan kembalikan entri yang tersimpan.

    ``value`` diharapkan "up" atau "down"; nilai lain dinormalkan menjadi
    "unknown" supaya isi file tetap konsisten tanpa menyembunyikan bug.
    """
    v = (value or "").strip().lower()
    if v not in ("up", "down"):
        v = "unknown"
    entry = {
        "message_id": (message_id or "").strip(),
        "value": v,
        "question": (question or "").strip(),
        "answer": (answer or "").strip(),
        "created_at": _now(),
    }
    with _store.lock:
        items = _store.read()
        if not isinstance(items, list):
            items = []
        # Idempoten per pesan: klik ulang atau ganti pilihan pada jawaban yang
        # sama akan memperbarui entri lama, bukan menambah duplikat.
        mid = entry["message_id"]
        replaced = False
        if mid:
            for i, it in enumerate(items):
                if str(it.get("message_id", "")) == mid:
                    items[i] = entry
                    replaced = True
                    break
        if not replaced:
            items.append(entry)
        _store.write(items)
    return entry


def summary() -> dict:
    """Ringkasan agregat sederhana: total, jumlah "up", jumlah "down"."""
    items = _store.read()
    if not isinstance(items, list):
        return {"total": 0, "up": 0, "down": 0}
    up = sum(1 for it in items if str(it.get("value")) == "up")
    down = sum(1 for it in items if str(it.get("value")) == "down")
    return {"total": len(items), "up": up, "down": down}


def clear() -> None:
    """Kosongkan seluruh umpan balik (disiapkan untuk tombol reset di UI)."""
    with _store.lock:
        _store.write([])
