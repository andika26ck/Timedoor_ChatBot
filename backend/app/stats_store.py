"""Statistik frekuensi pertanyaan (stats.json).

Setiap pertanyaan yang berhasil diproses dicatat + dihitung, supaya frontend
bisa menampilkan pertanyaan populer yang DINAMIS berdasarkan seberapa sering
ditanyakan.
"""
from datetime import datetime, timezone

from app.jsonstore import JsonStore

_store = JsonStore("stats.json", [])

# Input terlalu pendek ("hai", "tes", typo) tidak layak jadi "pertanyaan
# populer", jadi diabaikan supaya daftarnya tetap bersih.
_MIN_LEN = 10


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def record_question(question: str) -> None:
    q = (question or "").strip()
    if len(q) < _MIN_LEN:
        return
    key = q.lower()
    with _store.lock:
        items = _store.read()
        if not isinstance(items, list):
            items = []
        found = None
        for it in items:
            if str(it.get("question", "")).strip().lower() == key:
                found = it
                break
        if found:
            found["count"] = int(found.get("count", 0)) + 1
            found["last_asked"] = _now()
            found["question"] = q
        else:
            items.append({"question": q, "count": 1, "last_asked": _now()})
        _store.write(items)


def popular(limit: int = 6) -> list[dict]:
    items = _store.read()
    if not isinstance(items, list):
        return []
    ranked = sorted(
        items,
        key=lambda i: (int(i.get("count", 0)), i.get("last_asked", "")),
        reverse=True,
    )
    return [
        {"question": i.get("question", ""), "count": int(i.get("count", 0))}
        for i in ranked[:limit]
        if i.get("question")
    ]


def clear() -> None:
    """Kosongkan statistik. Belum dipakai endpoint, disiapkan untuk fitur
    tombol reset statistik di menu Kelola DB."""
    with _store.lock:
        _store.write([])
