"""app/documents.py — Kelola dokumen knowledge base.

Penyimpanan knowledge base: PostgreSQL + pgvector
----------------------------------------------
Dokumen di-chunk + di-embed (paket engine) lalu disimpan ke PostgreSQL/pgvector,
Registry lokal (documents.json)
TETAP menyimpan metadata kaya (kategori, domain, topik, ringkasan, dokumen
terkait) untuk UI. Header metadata tetap diselipkan di atas
teks supaya pencarian semantik terbantu (Level 1 & 2).

Antarmuka publik dijaga stabil sehingga app/main.py
tidak perlu berubah:
  add_file, add_text, update_file, update_text, delete_doc, read_content,
  DATA_DIR, ALLOWED.
"""
from __future__ import annotations

import logging
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path

from app import registry
from app.settings_store import get_chunking
from app.store import get_vector_store
from engine import config as engine_config
from engine.chunker import chunk_text
from engine.embedder import embed_texts

logger = logging.getLogger("faq-bot")

# Default: backend/data (perilaku lama). Saat deploy, set DOCS_DIR ke folder
# volume supaya dokumen yang diunggah lewat UI tidak hilang saat redeploy.
DATA_DIR = Path(os.getenv("DOCS_DIR") or Path(__file__).resolve().parent.parent / "data")
DATA_DIR.mkdir(parents=True, exist_ok=True)
ALLOWED = {".pdf", ".md", ".txt", ".docx"}

# batas panjang teks pratinjau supaya payload tidak kebesaran
_PREVIEW_LIMIT = 20000


# ------------------------------ Metadata helpers ------------------------------


def _prefix_name(name: str, category: str) -> str:
    """Terapkan konvensi penamaan: prefix kategori (SOP_, RULES_, dst)."""
    category = (category or "").strip()
    if not category:
        return name
    prefix = f"{category}_"
    if name.upper().startswith(prefix.upper()):
        return name
    return prefix + name


def _rel_name(src_path: Path) -> str:
    """Nama file yang dicatat di registry, relatif terhadap folder data/.

    Dengan path relatif, subfolder (mis. data/Acuan 2/guideline_ch1.md) tetap
    bisa ditemukan lagi oleh read_content() dan delete_doc(). File di luar
    DATA_DIR (kasus langka) jatuh ke basename.
    """
    try:
        return src_path.resolve().relative_to(DATA_DIR.resolve()).as_posix()
    except ValueError:
        return src_path.name


def _build_header(meta: dict) -> str:
    """Header metadata yang diselipkan di atas isi dokumen teks (Level 1 & 2)."""
    lines: list[str] = []
    if meta.get("category"):
        lines.append(f"Kategori: {meta['category']}")
    if meta.get("domain"):
        lines.append(f"Domain: {meta['domain']}")
    topics = meta.get("topics") or []
    if topics:
        lines.append(f"Topik: {', '.join(topics)}")
    if meta.get("summary"):
        lines.append(f"Ringkasan: {meta['summary']}")
    related = meta.get("related") or []
    if related:
        lines.append(f"Dokumen terkait: {', '.join(related)}")
    if not lines:
        return ""
    return "---\n" + "\n".join(lines) + "\n---\n\n"


# ------------------------------ Chunking config ------------------------------


def _chunk_params() -> tuple[int, int]:
    """(max_tokens, overlap) dari setelan aktif; 0 => pakai default engine."""
    max_tokens, overlap = get_chunking()
    if not max_tokens:
        return engine_config.CHUNK_MAX_TOKENS, engine_config.CHUNK_OVERLAP_TOKENS
    return int(max_tokens), int(overlap)


def describe_chunking() -> str:
    """Teks pendek untuk log/CLI."""
    max_tokens, overlap = get_chunking()
    if not max_tokens:
        return (
            f"default engine (max_tokens={engine_config.CHUNK_MAX_TOKENS}, "
            f"overlap={engine_config.CHUNK_OVERLAP_TOKENS})"
        )
    return f"kustom (max_tokens={max_tokens}, overlap={overlap})"


# ------------------------------ Pembaca teks ------------------------------


def _extract_pdf(path: Path) -> str:
    try:
        from pypdf import PdfReader
    except ImportError:
        return (
            "(Butuh paket 'pypdf' untuk membaca PDF. Jalankan: "
            "python -m pip install pypdf)"
        )
    try:
        reader = PdfReader(str(path))
        parts = [(page.extract_text() or "") for page in reader.pages]
        text = "\n\n".join(parts).strip()
        return text or (
            "(PDF tidak mengandung teks yang bisa diekstrak \u2014 kemungkinan "
            "hasil scan/gambar.)"
        )
    except Exception as exc:  # noqa: BLE001
        return f"(Gagal membaca PDF: {exc})"


def _extract_docx(path: Path) -> str:
    try:
        import docx  # dari paket python-docx
    except ImportError:
        return (
            "(Butuh paket 'python-docx' untuk membaca DOCX. Jalankan: "
            "python -m pip install python-docx)"
        )
    try:
        document = docx.Document(str(path))
        text = "\n".join(p.text for p in document.paragraphs).strip()
        return text or "(Dokumen kosong.)"
    except Exception as exc:  # noqa: BLE001
        return f"(Gagal membaca DOCX: {exc})"


def _extract_text(path: Path) -> str:
    ext = path.suffix.lower()
    if ext in (".txt", ".md"):
        try:
            return path.read_text(encoding="utf-8", errors="replace")
        except OSError as exc:
            return f"(Gagal membaca file: {exc})"
    if ext == ".pdf":
        return _extract_pdf(path)
    if ext == ".docx":
        return _extract_docx(path)
    return "(Format ini tidak didukung.)"


def _looks_unreadable(text: str) -> bool:
    """True kalau _extract_text mengembalikan pesan placeholder, bukan isi asli."""
    t = (text or "").strip()
    return t.startswith("(") and t.endswith(")") and len(t) < 200


# ------------------------------ Indexing ke Postgres ------------------------------


def _index_to_store(doc_id: str, display_name: str, text: str, meta: dict) -> int:
    """Chunk + embed teks dokumen, tulis ke vector store (ganti chunk lama)."""
    max_tokens, overlap = _chunk_params()
    chunks = chunk_text(text, max_tokens, overlap)
    store = get_vector_store()

    # Selalu bersihkan chunk lama untuk doc_id ini lebih dulu (idempoten).
    store.drop_doc(doc_id)
    if not chunks:
        store.save()
        return 0

    vectors = embed_texts([c.text for c in chunks])
    topics = meta.get("topics") or []
    records = []
    for i, (chunk, vec) in enumerate(zip(chunks, vectors)):
        records.append(
            {
                "id": f"{doc_id}::{i}",
                "doc_id": doc_id,
                "text": chunk.text,
                "vector": [float(x) for x in vec],
                "metadata": {
                    "doc_id": doc_id,
                    "doc_name": Path(doc_id).name,
                    "display_name": display_name,
                    "judul": display_name,
                    "chunk_index": i,
                    "approx_tokens": getattr(chunk, "approx_tokens", 0),
                    "kategori": meta.get("category") or "",
                    "domain": meta.get("domain") or "",
                    "topics": ", ".join(topics),
                    "summary": meta.get("summary") or "",
                },
            }
        )
    store.add(records)
    store.save()
    return len(records)


# ------------------------------ API publik ------------------------------


def _find_by_filename(filename: str) -> dict | None:
    """Cari entry registry berdasarkan nama file (identitas dokumen)."""
    for doc in registry.list_docs():
        if doc.get("filename") == filename:
            return doc
    return None


def _unique_filename(name: str) -> str:
    """Kembalikan nama file yang belum dipakai (tambah sufiks -2, -3, ...)."""
    existing = {d.get("filename") for d in registry.list_docs()}
    if name not in existing:
        return name
    stem = Path(name).stem
    suffix = Path(name).suffix or ".md"
    i = 2
    while f"{stem}-{i}{suffix}" in existing:
        i += 1
    return f"{stem}-{i}{suffix}"


def add_file(src_path: Path, display_name: str, meta: dict | None = None) -> dict:
    """Index file ke Postgres, catat di registry, kembalikan entry-nya."""
    meta = meta or {}
    src_path = Path(src_path)
    display_name = _prefix_name(display_name, meta.get("category", ""))
    doc_id = _rel_name(src_path)

    text = _extract_text(src_path)
    if _looks_unreadable(text):
        # File tidak bisa dibaca jadi teks (mis. PDF hasil scan / lib hilang).
        raise ValueError(
            f"Tidak bisa mengekstrak teks dari '{src_path.name}': {text.strip('()')}"
        )

    max_tokens, overlap = _chunk_params()
    n_chunks = _index_to_store(doc_id, display_name, text, meta)

    # Upsert berdasarkan nama file: kalau nama file sudah ada, pakai ulang id-nya
    # supaya dokumen ter-update di tempat (tidak muncul baris dobel di dashboard).
    existing = _find_by_filename(doc_id)
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    # created_at dicatat sekali saat dokumen pertama dibuat, lalu DIPERTAHANKAN
    # di setiap update. uploaded_at selalu di-refresh = "terakhir diperbarui".
    # Entri lama yang belum punya created_at di-fallback ke uploaded_at-nya.
    created_at = (
        (existing.get("created_at") or existing.get("uploaded_at") or now)
        if existing
        else now
    )
    # source_group: penanda asal dokumen (Smart Upload). Kalau tidak dikirim saat
    # update, pertahankan nilai lama supaya deteksi orphan tetap konsisten.
    source_group = (
        meta.get("source_group")
        or (existing.get("source_group") if existing else "")
        or ""
    )
    entry = {
        "id": existing["id"] if existing else uuid.uuid4().hex,
        "chunking": {"max_tokens": max_tokens, "overlap": overlap},
        "display_name": display_name,
        "filename": doc_id,
        "doc_name": doc_id,
        "chunks": n_chunks,
        "metadata_indexed": True,
        "category": meta.get("category") or "",
        "domain": meta.get("domain") or "",
        "topics": meta.get("topics") or [],
        "summary": meta.get("summary") or "",
        "related": meta.get("related") or [],
        "created_at": created_at,
        "uploaded_at": now,
        "source_group": source_group,
    }
    return registry.add_doc(entry)


def find_orphans(source_group: str, keep_filenames: list[str]) -> list[dict]:
    """Bagian lama (yatim) untuk satu grup sumber Smart Upload.

    Kembalikan entri registry yang punya `source_group` sama TAPI nama filenya
    tidak ada di `keep_filenames` (mis. section yang judul H2-nya diganti saat
    dokumen sumber diunggah ulang). Read-only: TIDAK menghapus apa pun.
    """
    group = (source_group or "").strip()
    if not group:
        return []
    keep = {f for f in (keep_filenames or []) if f}
    orphans: list[dict] = []
    for doc in registry.list_docs():
        if (doc.get("source_group") or "").strip() != group:
            continue
        if doc.get("filename") in keep:
            continue
        orphans.append(doc)
    return orphans


def add_text(
    text: str,
    filename: str,
    meta: dict | None = None,
    on_conflict: str = "overwrite",
) -> dict:
    """Simpan teks mentah sebagai file (.md/.txt) lalu index ke Postgres.

    Header metadata (kategori/domain/topik/ringkasan/dokumen terkait) diselipkan
    di atas isi untuk membantu akurasi pencarian (Level 1 & 2).

    on_conflict:
      - "overwrite" (default): kalau nama file sama, dokumen lama DITIMPA
        (chunk & baris registri dipakai ulang lewat add_file).
      - "new": paksa jadi dokumen baru dengan nama file unik (…-2, …-3).
    """
    meta = meta or {}
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    filename = _prefix_name(filename, meta.get("category", ""))
    name = filename if filename.lower().endswith((".txt", ".md")) else f"{filename}.md"
    name = Path(name).name
    if on_conflict == "new":
        name = _unique_filename(name)
    path = DATA_DIR / name
    header = _build_header(meta)
    path.write_text(header + text, encoding="utf-8")
    return add_file(path, path.name, meta)


def delete_doc(doc_id: str) -> dict | None:
    """Hapus dokumen: dari vector store, registry, lalu file lokal."""
    entry = registry.get_doc(doc_id)
    if not entry:
        return None
    removed = registry.remove_doc(doc_id)

    filename = entry.get("filename")
    # Hanya lepas chunk & file kalau tidak dipakai entri lain (penting saat
    # update dengan nama file yang sama: entri baru sudah menunjuk ke sana).
    still_used = any(i.get("filename") == filename for i in registry.list_docs())
    if filename and not still_used:
        try:
            store = get_vector_store()
            store.drop_doc(filename)
            store.save()
        except Exception as exc:  # noqa: BLE001
            logger.warning("Gagal hapus chunk dari store untuk %s: %s", filename, exc)
        local = DATA_DIR / filename
        try:
            if local.exists():
                local.unlink()
        except OSError as exc:
            logger.warning("Gagal hapus file lokal %s: %s", local, exc)
    return removed


def update_file(
    doc_id: str, src_path: Path, display_name: str, meta: dict | None = None
) -> dict | None:
    """Ganti dokumen lama dengan file baru (tambah dulu, baru hapus)."""
    if not registry.get_doc(doc_id):
        return None
    new_entry = add_file(src_path, display_name, meta)
    # Kalau nama file sama, add_file sudah upsert id yang sama -> JANGAN hapus
    # (menghapusnya justru membuang dokumen yang baru saja diperbarui).
    if new_entry.get("id") != doc_id:
        delete_doc(doc_id)
    return new_entry


def update_text(
    doc_id: str, text: str, filename: str, meta: dict | None = None
) -> dict | None:
    """Ganti dokumen lama dengan teks baru (tambah dulu, baru hapus)."""
    if not registry.get_doc(doc_id):
        return None
    new_entry = add_text(text, filename, meta)
    if new_entry.get("id") != doc_id:
        delete_doc(doc_id)
    return new_entry


# ------------------------------ Pratinjau isi dokumen ------------------------------


def read_content(doc_id: str) -> dict | None:
    """Kembalikan isi (teks) dokumen untuk fitur \"Detail\" di UI."""
    entry = registry.get_doc(doc_id)
    if not entry:
        return None
    filename = entry.get("filename") or ""
    path = DATA_DIR / filename
    if not filename or not path.exists():
        content = (
            "(File lokal tidak ditemukan. Dokumen mungkin diindeks di versi "
            "sebelumnya sebelum fitur pratinjau ada.)"
        )
        truncated = False
    else:
        content = _extract_text(path)
        truncated = len(content) > _PREVIEW_LIMIT
        if truncated:
            content = content[:_PREVIEW_LIMIT] + "\n\n... (dipotong)"
    return {
        "id": entry.get("id"),
        "display_name": entry.get("display_name"),
        "filename": filename,
        "content": content,
        "truncated": truncated,
    }


# ------------------------------ Upload Pintar & Reset ------------------------------


def extract_text(path: Path) -> str:
    """Ekstrak teks mentah dari file (public wrapper untuk fitur auto-split)."""
    return _extract_text(Path(path))


def is_unreadable(text: str) -> bool:
    """True kalau hasil ekstraksi cuma pesan placeholder, bukan isi asli."""
    return _looks_unreadable(text)


def reset_all() -> int:
    """Kosongkan SELURUH knowledge base: registry + vektor + file lokal.

    Kembalikan jumlah dokumen yang terhapus dari registry. Dipakai tombol
    \"Reset KB\" di dashboard saat ingin memulai knowledge base dari nol.
    """
    deleted = 0
    for entry in registry.list_docs():
        doc_id = entry.get("id")
        if not doc_id:
            continue
        try:
            if delete_doc(doc_id):
                deleted += 1
        except Exception as exc:  # noqa: BLE001
            logger.warning("Gagal hapus dokumen %s saat reset: %s", doc_id, exc)

    # Sapu sisa vektor yang mungkin yatim (tidak tercatat di registry lagi).
    try:
        store = get_vector_store()
        for did in list(store.doc_ids()):
            store.drop_doc(did)
        store.save()
    except Exception as exc:  # noqa: BLE001
        logger.warning("Gagal membersihkan sisa vektor saat reset: %s", exc)
    return deleted
