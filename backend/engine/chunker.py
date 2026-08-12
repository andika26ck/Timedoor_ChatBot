"""
chunker.py — pemotong dokumen jadi chunk (table-aware).

Dua strategi (pilih via env RAG_CHUNK_STRATEGY):
  * "heading" (DEFAULT) — sadar struktur: potong pada batas heading Markdown
    (#..######) dan pada pertanyaan FAQ (**Qxx: ...**). Segmen kecil digabung
    sampai mendekati max_tokens; segmen besar dipecah lagi.

    TABLE-AWARE: blok tabel (Markdown "| ... |" maupun HTML <table>...</table>)
    TIDAK PERNAH dipotong di tengah baris. Kalau satu tabel Markdown terpaksa
    dipecah karena kelewat besar, baris header diulang di tiap potongan supaya
    konteks kolom tidak hilang.
  * "plain" — sliding-window lama (per-ukuran, tanpa lihat struktur).

Mengubah strategi otomatis memicu rebuild (lihat build_index pipeline version).

Interface dipertahankan agar kompatibel dengan build_index:
    chunk_text(text, max_tokens=600, overlap_tokens=120) -> list[Chunk]
    Chunk(index, text, word_count, approx_tokens)
"""
from __future__ import annotations

import os
import re
from dataclasses import dataclass
from typing import List

CHUNK_STRATEGY = os.getenv("RAG_CHUNK_STRATEGY", "heading").strip().lower()
if CHUNK_STRATEGY not in ("heading", "plain"):
    CHUNK_STRATEGY = "heading"

_CHARS_PER_TOKEN = 4  # heuristik: 1 token ≈ 4 karakter

_HEADING_RE = re.compile(r"^\s{0,3}#{1,6}\s+\S")
_FAQ_RE = re.compile(r"^\s*\*\*Q\s*\d+", re.IGNORECASE)
_HTML_TABLE_OPEN = re.compile(r"(?i)<table\b")
_HTML_TABLE_CLOSE = re.compile(r"(?i)</table>")


@dataclass
class Chunk:
    index: int
    text: str
    word_count: int
    approx_tokens: int


def _approx_tokens(text: str) -> int:
    return max(1, round(len(text) / _CHARS_PER_TOKEN))


def _mk(index: int, text: str) -> Chunk:
    text = text.strip()
    return Chunk(
        index=index,
        text=text,
        word_count=len(text.split()),
        approx_tokens=_approx_tokens(text),
    )


def _is_md_table_line(line: str) -> bool:
    """Baris tabel Markdown diawali '|' (termasuk baris pemisah '| --- |')."""
    return line.strip().startswith("|")


# --------------------------------------------------------------------------
# Strategi "plain" — sliding window per karakter dengan overlap
# --------------------------------------------------------------------------
def _sliding(text: str, max_tokens: int, overlap_tokens: int, start_index: int = 0) -> List[Chunk]:
    text = text.strip()
    if not text:
        return []
    max_chars = max(1, max_tokens * _CHARS_PER_TOKEN)
    overlap_chars = max(0, min(overlap_tokens, max_tokens - 1) * _CHARS_PER_TOKEN)
    if len(text) <= max_chars:
        return [_mk(start_index, text)]

    chunks: List[Chunk] = []
    step = max(1, max_chars - overlap_chars)
    pos = 0
    idx = start_index
    while pos < len(text):
        window = text[pos : pos + max_chars]
        # usahakan putus di spasi terdekat agar kata tidak terpotong
        if pos + max_chars < len(text):
            cut = window.rfind(" ")
            if cut > int(max_chars * 0.6):
                window = window[:cut]
        chunks.append(_mk(idx, window))
        idx += 1
        advance = len(window) - overlap_chars
        pos += max(step if advance <= 0 else advance, 1)
    return chunks


# --------------------------------------------------------------------------
# Table-aware helpers
# --------------------------------------------------------------------------
def _iter_blocks(text: str):
    """Pecah teks jadi blok baris berurutan: (is_table, teks).

    Blok tabel (HTML <table>...</table> atau baris-baris Markdown '|') dijaga
    utuh sebagai satu unit yang tak boleh dipotong.
    """
    lines = text.splitlines()
    n = len(lines)
    i = 0
    blocks: List[tuple[bool, str]] = []
    while i < n:
        # --- tabel HTML ---
        if _HTML_TABLE_OPEN.search(lines[i]):
            buf = [lines[i]]
            closed = bool(_HTML_TABLE_CLOSE.search(lines[i]))
            i += 1
            while not closed and i < n:
                buf.append(lines[i])
                if _HTML_TABLE_CLOSE.search(lines[i]):
                    closed = True
                i += 1
            blocks.append((True, "\n".join(buf)))
            continue
        # --- tabel Markdown ---
        if _is_md_table_line(lines[i]):
            buf = []
            while i < n and _is_md_table_line(lines[i]):
                buf.append(lines[i])
                i += 1
            blocks.append((True, "\n".join(buf)))
            continue
        # --- teks biasa ---
        buf = []
        while (
            i < n
            and not _is_md_table_line(lines[i])
            and not _HTML_TABLE_OPEN.search(lines[i])
        ):
            buf.append(lines[i])
            i += 1
        block = "\n".join(buf)
        if block.strip():
            blocks.append((False, block))
    return blocks


def _split_md_table(tbl: str, max_chars: int) -> List[str]:
    """Pecah tabel Markdown yang kelewat besar per-baris, header diulang."""
    rows = [r for r in tbl.splitlines() if r.strip()]
    if not rows:
        return [tbl]
    header = [rows[0]]
    body_start = 1
    # baris ke-2 adalah pemisah kalau hanya berisi | - : spasi
    if len(rows) >= 2 and set(rows[1].strip()) <= set("|-: "):
        header.append(rows[1])
        body_start = 2
    header_txt = "\n".join(header)

    pieces: List[str] = []
    cur: List[str] = []
    cur_len = len(header_txt)
    for r in rows[body_start:]:
        if cur and cur_len + 1 + len(r) > max_chars:
            pieces.append(header_txt + "\n" + "\n".join(cur))
            cur = [r]
            cur_len = len(header_txt) + 1 + len(r)
        else:
            cur.append(r)
            cur_len += 1 + len(r)
    if cur:
        pieces.append(header_txt + "\n" + "\n".join(cur))
    return pieces or [tbl]


def _emit_big_block(is_table: bool, block: str, max_tokens: int, overlap_tokens: int) -> List[str]:
    """Potong satu blok yang sendirian sudah melebihi max_tokens."""
    if is_table:
        first = block.splitlines()[0] if block.splitlines() else ""
        if _is_md_table_line(first):
            return _split_md_table(block, max(1, max_tokens * _CHARS_PER_TOKEN))
        # Tabel HTML: dijaga utuh walau besar (lebih baik chunk kebesaran
        # daripada struktur tabel rusak).
        return [block]
    return [c.text for c in _sliding(block, max_tokens, overlap_tokens)]


def _split_big_segment(seg: str, max_tokens: int, overlap_tokens: int) -> List[str]:
    """Pecah segmen besar per-blok; tabel tetap utuh."""
    max_chars = max(1, max_tokens * _CHARS_PER_TOKEN)
    out: List[str] = []
    buf = ""
    for is_table, block in _iter_blocks(seg):
        if _approx_tokens(block) > max_tokens:
            if buf.strip():
                out.append(buf)
                buf = ""
            out.extend(_emit_big_block(is_table, block, max_tokens, overlap_tokens))
            continue
        if not buf:
            buf = block
        elif len(buf) + 2 + len(block) <= max_chars:
            buf = f"{buf}\n\n{block}"
        else:
            out.append(buf)
            buf = block
    if buf.strip():
        out.append(buf)
    return out


# --------------------------------------------------------------------------
# Strategi "heading" — potong pada heading/FAQ, gabung kecil, pecah besar
# --------------------------------------------------------------------------
def _split_segments(text: str) -> List[str]:
    """Pecah teks jadi segmen pada batas heading Markdown atau pertanyaan FAQ."""
    lines = text.splitlines()
    segments: List[str] = []
    current: List[str] = []

    def flush():
        if current:
            seg = "\n".join(current).strip()
            if seg:
                segments.append(seg)

    for line in lines:
        is_boundary = bool(_HEADING_RE.match(line)) or bool(_FAQ_RE.match(line))
        if is_boundary and current:
            flush()
            current = [line]
        else:
            current.append(line)
    flush()
    return segments or ([text.strip()] if text.strip() else [])


def _chunk_heading(text: str, max_tokens: int, overlap_tokens: int) -> List[Chunk]:
    segments = _split_segments(text)
    max_chars = max(1, max_tokens * _CHARS_PER_TOKEN)

    # gabung segmen kecil yang berdekatan sampai mendekati max_chars
    packed: List[str] = []
    buf = ""
    for seg in segments:
        if not buf:
            buf = seg
        elif len(buf) + 2 + len(seg) <= max_chars:
            buf = f"{buf}\n\n{seg}"
        else:
            packed.append(buf)
            buf = seg
    if buf:
        packed.append(buf)

    # segmen yang masih kelewat besar dipecah per-blok (tabel tetap utuh)
    chunks: List[str] = []
    for seg in packed:
        if _approx_tokens(seg) <= max_tokens:
            chunks.append(seg)
        else:
            chunks.extend(_split_big_segment(seg, max_tokens, overlap_tokens))
    # reindex rapi
    return [_mk(i, c) for i, c in enumerate(chunks) if c.strip()]


def chunk_text(text: str, max_tokens: int = 600, overlap_tokens: int = 120) -> List[Chunk]:
    text = (text or "").strip()
    if not text:
        return []
    if CHUNK_STRATEGY == "plain":
        return _sliding(text, max_tokens, overlap_tokens)
    return _chunk_heading(text, max_tokens, overlap_tokens)
