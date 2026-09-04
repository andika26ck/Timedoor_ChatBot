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


# Ambang default: sebuah pertanyaan baru dianggap "populer" hanya bila sudah
# ditanya minimal sekian kali. Mencegah pertanyaan sekali-ketik (atau teks
# sensitif yang tak sengaja diketik user) langsung tampil sebagai saran.
_MIN_COUNT = 2

# Saran cadangan (seed) saat data nyata belum cukup. Silakan sesuaikan dengan
# pertanyaan paling relevan untuk knowledge base kamu. count=0 menandai seed.
_SEED = [
    "Bagaimana cara login ke CMS?",
    "Bagaimana cara reset password akun?",
    "Apa saja peran (role) pengguna di sistem?",
    "Bagaimana cara menambah data baru di CMS?",
    "Bagaimana cara menghubungi tim support?",
    "Apa itu Timedoor Academy?",
]


def raw() -> list[dict]:
    """Seluruh entri statistik apa adanya (dipakai admin & endpoint reset)."""
    items = _store.read()
    return items if isinstance(items, list) else []


def popular(
    limit: int = 6, min_count: int = _MIN_COUNT, with_seed: bool = True
) -> list[dict]:
    """Pertanyaan populer, diurut dari paling sering & paling baru ditanya.

    - min_count: hanya tampilkan yang sudah ditanya >= sekian kali (default 2).
    - with_seed: bila hasil nyata belum cukup limit, lengkapi dengan _SEED
      (count 0) supaya empty-state chat tidak pernah kosong.
    """
    items = raw()
    ranked = sorted(
        (
            i
            for i in items
            if i.get("question") and int(i.get("count", 0)) >= min_count
        ),
        key=lambda i: (int(i.get("count", 0)), i.get("last_asked", "")),
        reverse=True,
    )
    out = [
        {"question": i.get("question", ""), "count": int(i.get("count", 0))}
        for i in ranked[:limit]
    ]
    if with_seed and len(out) < limit:
        seen = {o["question"].strip().lower() for o in out}
        for q in _SEED:
            if len(out) >= limit:
                break
            if q.strip().lower() not in seen:
                out.append({"question": q, "count": 0})
                seen.add(q.strip().lower())
    return out


def clear() -> None:
    """Kosongkan statistik. Dipakai endpoint POST /admin/stats/reset (menu
    Kelola DB) untuk mengosongkan daftar pertanyaan populer."""
    with _store.lock:
        _store.write([])
