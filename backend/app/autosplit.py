"""app/autosplit.py — Pecah 1 dokumen besar jadi beberapa sub-dokumen per H2.

Dipakai fitur "Upload Pintar": satu guideline besar (mis. 1 file berisi semua
topik) dipecah otomatis pada tiap heading level-2 (`## ...`). Tiap bagian jadi
kandidat dokumen tersendiri, dilengkapi saran metadata (kategori/domain/topik/
ringkasan) dari classify.suggest_metadata.

Hasil fungsi ini HANYA usulan (pratinjau). Penyimpanan sesungguhnya dilakukan
frontend dengan memanggil POST /documents/text untuk tiap bagian yang disetujui.
"""
from __future__ import annotations

import logging
import re

from app import classify
from app.taxonomy import CATEGORIES, DOMAINS

logger = logging.getLogger("faq-bot")

# Batas aman jumlah bagian supaya input ekstrem tidak memicu ratusan panggilan
# klasifikasi ke Gemini sekaligus.
_MAX_SECTIONS = 80

_HEADING_RE = re.compile(r"^\s{0,3}(#{1,6})\s+(\S.*?)\s*$")

# Frontmatter YAML di awal dokumen (--- ... ---) diabaikan agar tidak jadi isi.
_FRONTMATTER_RE = re.compile(r"^\ufeff?---[ \t]*\n.*?\n---[ \t]*\n", re.DOTALL)

# Baris metadata opsional tepat di bawah judul, mis:
#   _Domain: CMS Admin · Kategori: SOP · Topik: inquiry, registrasi_
_META_KV_RE = re.compile(
    r"(Domain|Kategori|Category|Topik|Topics)\s*:\s*(.+)",
    re.IGNORECASE,
)


def _strip_frontmatter(text: str) -> str:
    """Buang satu blok frontmatter YAML di paling awal dokumen (kalau ada)."""
    return _FRONTMATTER_RE.sub("", text or "", count=1)


def _extract_inline_meta(body: str) -> tuple[dict, str]:
    """Baca metadata eksplisit dari beberapa baris awal bagian (di bawah judul).

    Mengembalikan (meta, body_bersih). Baris metadata yang dikenali dibuang dari
    isi supaya tidak jadi noise (nilainya sudah tersimpan sebagai metadata).
    Hanya nilai yang valid terhadap taksonomi yang dipakai.
    """
    meta = {"category": "", "domain": "", "topics": []}
    lines = body.splitlines()
    consumed: set[int] = set()
    for idx, line in enumerate(lines[:8]):
        raw = line.strip()
        if not raw:
            continue
        if raw.startswith("#"):
            continue  # lewati baris judul
        inner = raw.strip("_* ").strip()
        found = False
        for part in re.split(r"[·|•]", inner):
            m = _META_KV_RE.fullmatch(part.strip())
            if not m:
                continue
            key = m.group(1).lower()
            val = m.group(2).strip().strip("_* ").strip()
            if key == "domain":
                if val in DOMAINS:
                    meta["domain"] = val
            elif key in ("kategori", "category"):
                if val.upper() in CATEGORIES:
                    meta["category"] = val.upper()
            else:  # topik / topics
                meta["topics"] = [
                    t.strip().lower() for t in val.split(",") if t.strip()
                ][:4]
            found = True
        if found:
            consumed.add(idx)
        else:
            break  # sudah masuk baris konten biasa -> berhenti memindai
    if consumed:
        body = "\n".join(
            ln for i, ln in enumerate(lines) if i not in consumed
        ).strip()
    return meta, body


def _heading_level(line: str) -> int:
    m = _HEADING_RE.match(line)
    return len(m.group(1)) if m else 0


def _heading_text(line: str) -> str:
    m = _HEADING_RE.match(line)
    return m.group(2).strip() if m else ""


def _slugify(title: str, fallback: str = "bagian") -> str:
    s = (title or "").strip().lower()
    s = re.sub(r"[^\w\s-]", "", s, flags=re.UNICODE)  # buang tanda baca
    s = re.sub(r"[\s_]+", "-", s)
    s = re.sub(r"-{2,}", "-", s).strip("-")
    return (s or fallback)[:60]


def split_sections(text: str, level: int = 2) -> list[dict]:
    """Pecah teks pada tiap heading `level` (default H2).

    Bagian sebelum heading pertama (preamble) dijadikan satu bagian sendiri
    HANYA jika mengandung isi (bukan cuma judul H1).
    """
    lines = _strip_frontmatter(text or "").splitlines()
    preamble: list[str] = []
    sections: list[dict] = []
    current: dict | None = None

    for line in lines:
        if _heading_level(line) == level:
            current = {"title": _heading_text(line), "lines": [line]}
            sections.append(current)
        elif current is None:
            preamble.append(line)
        else:
            current["lines"].append(line)

    result: list[dict] = []

    pre_text = "\n".join(preamble).strip()
    has_body = any(ln.strip() and _heading_level(ln) == 0 for ln in preamble)
    if pre_text and has_body:
        h1 = next(
            (_heading_text(ln) for ln in preamble if _heading_level(ln) == 1), ""
        )
        result.append({"title": h1 or "Pendahuluan", "body": pre_text})

    for sec in sections:
        body = "\n".join(sec["lines"]).strip()
        if body:
            result.append({"title": sec["title"] or "(tanpa judul)", "body": body})

    return result[:_MAX_SECTIONS]


def build_sections(
    text: str, classify_meta: bool = True, level: int = 2
) -> list[dict]:
    """Bangun daftar usulan dokumen dari 1 teks besar (untuk pratinjau).

    `level` menentukan batas pemecahan: 2 = per heading H2 (##), 3 = per H3
    (###). Nilai lain dianggap 2 supaya aman.
    """
    level = level if level in (2, 3) else 2
    sections = split_sections(text, level=level)
    out: list[dict] = []
    seen: set[str] = set()

    for i, sec in enumerate(sections):
        meta = {"category": "", "domain": "", "topics": [], "summary": ""}

        # 1) Metadata eksplisit dari file (paling dipercaya, tanpa tebakan AI).
        inline, body = _extract_inline_meta(sec["body"])
        meta["category"] = inline["category"]
        meta["domain"] = inline["domain"]
        meta["topics"] = list(inline["topics"])
        sec["body"] = body  # isi yang sudah dibersihkan dari baris metadata

        # 2) Lengkapi field yang masih kosong dengan saran AI (jika diaktifkan).
        need_ai = classify_meta and not (
            meta["category"] and meta["domain"] and meta["topics"] and meta["summary"]
        )
        if need_ai:
            try:
                sug = classify.suggest_metadata(sec["body"])
                meta["category"] = meta["category"] or sug.get("category", "")
                meta["domain"] = meta["domain"] or sug.get("domain", "")
                meta["topics"] = meta["topics"] or (sug.get("topics", []) or [])
                meta["summary"] = meta["summary"] or sug.get("summary", "")
            except Exception as exc:  # noqa: BLE001
                logger.warning(
                    "Gagal klasifikasi bagian '%s': %s", sec["title"], exc
                )

        slug = _slugify(sec["title"], fallback=f"bagian-{i + 1}")
        name = slug
        n = 2
        while name in seen:
            name = f"{slug}-{n}"
            n += 1
        seen.add(name)

        out.append(
            {
                "title": sec["title"],
                "filename": f"{name}.md",
                "category": meta["category"],
                "domain": meta["domain"],
                "topics": meta["topics"],
                "summary": meta["summary"],
                "content": sec["body"],
                "char_count": len(sec["body"]),
            }
        )
    return out
