"""Rate limiting sederhana berbasis memori (fixed-window per menit).

CATATAN: penghitung disimpan di memori proses. Kalau backend berjalan di
BEBERAPA instance (mis. scaling horizontal di Railway), tiap instance punya
penghitung sendiri, sehingga batas efektifnya = limit x jumlah instance. Untuk
skala saat ini sudah memadai; bila perlu presisi lintas-instance, pindahkan
penyimpanannya ke Redis.
"""
from __future__ import annotations

import threading
import time

_LOCK = threading.Lock()
# identity -> [window_minute, count]
_HITS: dict[str, list[int]] = {}


def hit(identity: str, limit_per_min: int) -> tuple[bool, int]:
    """Catat satu permintaan. Return (allowed, retry_after_seconds).

    allowed=False bila jumlah permintaan pada menit berjalan sudah >= limit.
    retry_after_seconds = sisa detik sampai jendela menit berikutnya.
    """
    if limit_per_min <= 0:
        return True, 0
    now = time.time()
    minute = int(now // 60)
    retry_after = 60 - int(now % 60)
    with _LOCK:
        rec = _HITS.get(identity)
        if rec is None or rec[0] != minute:
            _HITS[identity] = [minute, 1]
            _maybe_gc(minute)
            return True, 0
        if rec[1] >= limit_per_min:
            return False, max(1, retry_after)
        rec[1] += 1
        return True, 0


def _maybe_gc(minute: int) -> None:
    """Bersihkan entri menit lama sesekali agar dict tidak tumbuh terus."""
    if len(_HITS) < 1024:
        return
    stale = [k for k, v in _HITS.items() if v[0] < minute - 1]
    for k in stale:
        _HITS.pop(k, None)
