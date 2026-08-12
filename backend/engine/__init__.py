# >>> env bootstrap >>>
# Memuat backend/.env ke environment sebelum modul engine mana pun membacanya.
# Environment variable yang sudah ada TIDAK ditimpa (pakai setdefault).
def _load_dotenv_once() -> None:
    import os
    from pathlib import Path as _Path

    _here = _Path(__file__).resolve()
    _candidates = (
        _Path.cwd() / ".env",           # dijalankan dari folder backend/
        _here.parent.parent / ".env",   # backend/.env relatif ke engine/
        _here.parent / ".env",          # engine/.env kalau ada
    )
    for _env_path in _candidates:
        if not _env_path.is_file():
            continue
        try:
            _raw = _env_path.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        for _line in _raw.splitlines():
            _line = _line.strip()
            if not _line or _line.startswith("#") or "=" not in _line:
                continue
            _key, _val = _line.split("=", 1)
            _key = _key.strip()
            _val = _val.strip().strip('"').strip("'")
            if _key and _val:
                os.environ.setdefault(_key, _val)
        break


_load_dotenv_once()
del _load_dotenv_once
# <<< env bootstrap <<<

"""Engine RAG mandiri.

Pipeline: chunk -> embed (Gemini) -> simpan vektor (Postgres/JSONL) -> cari -> ekspor.
Dibangun sekali (indexing), lalu dipakai untuk retrieval saat menjawab.
"""
