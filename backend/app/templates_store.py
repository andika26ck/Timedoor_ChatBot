"""CRUD pertanyaan template (templates.json).

Pertanyaan template adalah pertanyaan siap-klik yang dikelola manual oleh admin
lewat menu Template di frontend.
"""
import uuid
from datetime import datetime, timezone

from app.jsonstore import JsonStore

# Default diambil dari pertanyaan nyata yang sering muncul di operasional
# Timedoor Academy (CMS/LMS), bukan contoh generik.
_DEFAULTS = [
    "Apa urutan prioritas status siswa?",
    "Bagaimana cara Set to Paid invoice di menu Accounting?",
    "Siapa saja yang boleh mengisi Meeting Journal?",
    "Bagaimana alur membuat dan menerbitkan Student Report?",
    "Apa yang terjadi kalau siswa dihapus dari sistem?",
    "Bagaimana cara login akun Free Trial?",
]

# default None supaya kita bisa membedakan "file belum ada" (perlu di-seed)
# dari "list kosong" (sengaja dikosongkan admin).
_store = JsonStore("templates.json", None)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _ensure() -> list[dict]:
    data = _store.read()
    if data is None:
        data = [
            {"id": uuid.uuid4().hex, "text": t, "created_at": _now()}
            for t in _DEFAULTS
        ]
        _store.write(data)
    return data if isinstance(data, list) else []


def list_templates() -> list[dict]:
    return _ensure()


def add_template(text: str) -> dict:
    with _store.lock:
        items = _ensure()
        entry = {"id": uuid.uuid4().hex, "text": text, "created_at": _now()}
        items.append(entry)
        _store.write(items)
    return entry


def update_template(template_id: str, text: str) -> dict | None:
    with _store.lock:
        items = _ensure()
        target = None
        for it in items:
            if it.get("id") == template_id:
                it["text"] = text
                target = it
                break
        if target:
            _store.write(items)
        return target


def remove_template(template_id: str) -> dict | None:
    with _store.lock:
        items = _ensure()
        target = next((i for i in items if i.get("id") == template_id), None)
        if target:
            _store.write([i for i in items if i.get("id") != template_id])
        return target
