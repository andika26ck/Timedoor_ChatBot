"""
frontmatter.py — memisahkan YAML front-matter dari isi dokumen.

Sebelumnya blok front-matter (judul/kategori/domain/label/sumber_asli/
terakhir_update) ikut di-embed sebagai teks. Akibatnya chunk ke-0 setiap
dokumen jadi mirip satu sama lain dan skor kemiripan ikut terkontaminasi
boilerplate.

Sekarang: front-matter di-parse -> disimpan sebagai METADATA, dan hanya
judul/domain/kategori (ringkas) yang ditempelkan sebagai header konteks.
"""
from __future__ import annotations

from typing import Dict, List, Tuple, Union

_FENCE = "---"

MetaValue = Union[str, List[str]]


def split_front_matter(raw: str) -> Tuple[Dict[str, MetaValue], str]:
    """Kembalikan (metadata, isi_tanpa_front_matter).

    Kalau dokumen tidak punya front-matter, metadata kosong dan isi utuh.
    """
    text = raw.lstrip("\ufeff")
    lines = text.splitlines()

    i = 0
    while i < len(lines) and lines[i].strip() == "":
        i += 1
    if i >= len(lines) or lines[i].strip() != _FENCE:
        return {}, text.strip()

    start = i + 1
    end = None
    for j in range(start, len(lines)):
        if lines[j].strip() == _FENCE:
            end = j
            break
    if end is None:
        return {}, text.strip()

    meta: Dict[str, MetaValue] = {}
    for line in lines[start:end]:
        s = line.strip()
        if not s or s.startswith("#") or ":" not in s:
            continue
        key, _, val = s.partition(":")
        key = key.strip()
        val = val.strip()
        if val.startswith("[") and val.endswith("]"):
            items = [x.strip().strip("'\"") for x in val[1:-1].split(",")]
            meta[key] = [x for x in items if x]
        else:
            meta[key] = val.strip("'\"")

    body = "\n".join(lines[end + 1 :]).strip()
    return meta, body


def as_scalar(value: object) -> str:
    """Metadata vector store sebaiknya skalar, jadi list dijadikan string."""
    if isinstance(value, (list, tuple)):
        return ", ".join(str(v) for v in value)
    if value is None:
        return ""
    return str(value)


def context_header(meta: Dict[str, MetaValue], fallback_name: str) -> str:
    """Header pendek yang ditempel ke tiap chunk supaya punya konteks dokumen."""
    judul = as_scalar(meta.get("judul")) or fallback_name
    bits = [judul]
    domain = as_scalar(meta.get("domain"))
    kategori = as_scalar(meta.get("kategori"))
    if domain:
        bits.append(domain)
    if kategori:
        bits.append(kategori)
    return " · ".join(bits)
