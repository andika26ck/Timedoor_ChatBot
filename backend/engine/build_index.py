"""
build_index.py — Fase 1: chunk + embed + simpan indeks. RESUMABLE.

Versi v4:
  * Front-matter TIDAK di-embed (jadi metadata).
  * Header konteks OPSIONAL (default MATI) via RAG_EMBED_HEADER=1.
  * Strategi chunking via RAG_CHUNK_STRATEGY (heading|plain, default heading).
  * Strategi + toggle header ikut menentukan versi pipeline, jadi mengubahnya
    otomatis memicu rebuild supaya vektor tetap sebanding.
  * Progres disimpan SETIAP dokumen (resumable kalau kena 429).
"""
from __future__ import annotations

import hashlib
import json
import os
import sys
import time
from pathlib import Path

from . import config
from .chunker import CHUNK_STRATEGY, chunk_text
from .embedder import embed_texts
from .frontmatter import as_scalar, context_header, split_front_matter
from .vector_store import get_store

_MANIFEST = "manifest.json"
_SLEEP_BETWEEN_DOCS = float(os.getenv("RAG_SLEEP_BETWEEN_DOCS", "1.0"))
_EMBED_HEADER = os.getenv("RAG_EMBED_HEADER", "0").strip() in ("1", "true", "True")
_PIPELINE_VERSION = (
    f"5-fm-metadata-header{int(_EMBED_HEADER)}-chunk_{CHUNK_STRATEGY}-tbl"
)


def _print_header() -> None:
    mode = "[MOCK]" if config.MOCK_EMBED else "[API]"
    print(f"Docs   : {config.DOCS_DIR}")
    print(f"Index  : {config.INDEX_DIR}")
    print(f"Backend: {config.STORE_BACKEND}")
    print(f"Model  : {config.EMBED_MODEL} (dim={config.EMBED_DIM}) {mode}")
    print(
        f"Chunk  : max={config.CHUNK_MAX_TOKENS} "
        f"overlap={config.CHUNK_OVERLAP_TOKENS} token | strategi={CHUNK_STRATEGY}"
    )
    print(f"Header di-embed: {'YA' if _EMBED_HEADER else 'TIDAK (teks murni)'}")
    print(f"Pipeline: {_PIPELINE_VERSION}")
    print("------------------------------------------------")


def _iter_docs(docs_dir: Path):
    for p in sorted(docs_dir.rglob("*.md")):
        yield p


def _hash_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _fresh_manifest() -> dict:
    return {"_meta": {"pipeline_version": _PIPELINE_VERSION}, "docs": {}}


def _load_manifest(index_dir: Path) -> dict:
    f = index_dir / _MANIFEST
    if not f.exists():
        return _fresh_manifest()
    try:
        data = json.loads(f.read_text(encoding="utf-8"))
    except Exception:
        return _fresh_manifest()
    if isinstance(data, dict) and isinstance(data.get("docs"), dict):
        data.setdefault("_meta", {})
        return data
    docs = data if isinstance(data, dict) else {}
    return {"_meta": {"pipeline_version": "1"}, "docs": docs}


def _save_manifest(index_dir: Path, manifest: dict) -> None:
    index_dir.mkdir(parents=True, exist_ok=True)
    (index_dir / _MANIFEST).write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8"
    )


def _reset_store(store) -> int:
    dropped = 0
    for doc_id in list(store.doc_ids()):
        store.drop_doc(doc_id)
        dropped += 1
    store.save()
    return dropped


def main() -> int:
    _print_header()
    docs_dir = config.DOCS_DIR
    index_dir = config.INDEX_DIR
    store = get_store(config.STORE_BACKEND, index_dir)
    manifest = _load_manifest(index_dir)

    old_version = (manifest.get("_meta") or {}).get("pipeline_version")
    if old_version != _PIPELINE_VERSION:
        dropped = _reset_store(store)
        if dropped or manifest.get("docs"):
            print(
                f"! Pipeline berubah (lama: {old_version or 'tidak diketahui'}). "
                f"Indeks lama dibuang ({dropped} dokumen) dan dibangun ulang "
                "supaya vektornya sebanding."
            )
            print("------------------------------------------------")
        manifest = _fresh_manifest()
        _save_manifest(index_dir, manifest)

    docs_map = manifest["docs"]
    existing = set(store.doc_ids())

    total_docs = 0
    embedded_docs = 0
    skipped_docs = 0
    new_chunks = 0

    for path in _iter_docs(docs_dir):
        total_docs += 1
        rel = str(path.relative_to(docs_dir))
        file_hash = _hash_file(path)
        if docs_map.get(rel) == file_hash and rel in existing:
            skipped_docs += 1
            continue

        raw = path.read_text(encoding="utf-8")
        meta, body = split_front_matter(raw)
        if not body.strip():
            body = raw

        chunks = chunk_text(
            body, config.CHUNK_MAX_TOKENS, config.CHUNK_OVERLAP_TOKENS
        )
        if not chunks:
            continue

        header = context_header(meta, path.stem)
        if _EMBED_HEADER:
            texts = [f"[{header}] {c.text}" for c in chunks]
        else:
            texts = [c.text for c in chunks]

        try:
            vectors = embed_texts(texts)
        except Exception as err:  # noqa: BLE001
            store.save()
            _save_manifest(index_dir, manifest)
            print("------------------------------------------------")
            print(f"BERHENTI di {rel}:")
            print(f"  {err}")
            print(
                f"Progres AMAN tersimpan: {embedded_docs} dokumen sudah di-embed "
                f"({new_chunks} chunk)."
            )
            print(
                "Jalankan ulang perintah yang SAMA nanti untuk melanjutkan; "
                "yang sudah selesai tidak akan di-embed lagi."
            )
            return 1

        if rel in existing:
            store.drop_doc(rel)

        records = []
        for idx, (chunk, vec) in enumerate(zip(chunks, vectors)):
            records.append(
                {
                    "id": f"{rel}::{idx}",
                    "doc_id": rel,
                    "text": chunk.text,
                    "vector": [float(x) for x in vec],
                    "metadata": {
                        "doc_id": rel,
                        "doc_name": path.name,
                        "chunk_index": idx,
                        "approx_tokens": chunk.approx_tokens,
                        "judul": as_scalar(meta.get("judul")) or path.stem,
                        "kategori": as_scalar(meta.get("kategori")),
                        "domain": as_scalar(meta.get("domain")),
                        "label": as_scalar(meta.get("label")),
                    },
                }
            )
        store.add(records)
        docs_map[rel] = file_hash
        store.save()
        _save_manifest(index_dir, manifest)

        embedded_docs += 1
        new_chunks += len(records)
        print(f"+ {rel}: {len(records)} chunk")
        time.sleep(_SLEEP_BETWEEN_DOCS)

    print("------------------------------------------------")
    print(
        f"Selesai. Dokumen: {total_docs} | di-embed: {embedded_docs} "
        f"| dilewati (tak berubah): {skipped_docs} | chunk baru: {new_chunks} "
        f"| total di indeks: {store.count()}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
