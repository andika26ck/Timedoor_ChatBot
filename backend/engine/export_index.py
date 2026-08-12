"""Ekspor indeks vektor ke satu file JSONL portabel (untuk diaudit / dipindah).

Tiap baris = satu chunk berisi: id, doc_id, teks, vektor (angka), metadata.

    python -m engine.export_index                    # -> index_cache/export.jsonl
    python -m engine.export_index my_vektor.jsonl     # nama sendiri
"""
from __future__ import annotations

import sys
from pathlib import Path

from . import config
from .vector_store import export_jsonl, get_store


def main() -> int:
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else (config.INDEX_DIR / "export.jsonl")
    store = get_store(config.STORE_BACKEND, config.INDEX_DIR)
    records = store.all_records()
    n = export_jsonl(records, out)
    dim = len(records[0]["vector"]) if records else 0
    print(f"Diekspor {n} chunk (vektor dim={dim} + teks + metadata) ke {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
