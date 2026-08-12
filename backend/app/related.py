"""Level 2: sarankan dokumen terkait ("Baca juga") berdasarkan sitasi.

Sumber data: field dokumen_terkait di front-matter, yang saat indexing
disimpan sebagai `related` di documents.json. Semua fungsi di sini MURNI
lookup lokal ke registry, TIDAK memanggil Gemini, jadi tidak memakai kuota.

Pencocokan dua tahap:
  1. Nama persis (display_name / filename / basename) -> menangani sitasi
     Gemini yang berprefix kategori, mis. SOP_cms_04_session-management.md.
  2. Slug deskriptif -> menangani referensi dokumen_terkait yang salah nama,
     mis. rules_01_system-rules.md yang sebenarnya sysrules_01_system-rules.md.

Nama persis diutamakan supaya dokumen sumber tidak tertukar saat dua dokumen
punya slug sama (mis. cms_04 vs guideline_ch4 = session-management).
"""
import re

from app import registry

_EXT = re.compile(r"\.(md|txt|pdf|docx)$", re.I)
_CATEGORY_PREFIX = re.compile(r"^(sop|rules|faq|glossary)_", re.I)
_SECTION_PREFIX = re.compile(r"^([a-z]+_)?(ch\d+|\d+)_", re.I)


def _slug(name: str) -> str:
    s = (name or "").strip().lower()
    s = _EXT.sub("", s)
    s = _CATEGORY_PREFIX.sub("", s)
    s = _SECTION_PREFIX.sub("", s)
    return s.strip("_-")


def _basename(name: str) -> str:
    return (name or "").split("/")[-1]


def _indexes(docs):
    by_name = {}
    by_slug = {}
    for d in docs:
        dn = d.get("display_name") or ""
        fn = d.get("filename") or ""
        for key in (dn, fn, _basename(fn)):
            if key:
                by_name.setdefault(key, d)
        slug = _slug(dn or fn)
        if slug:
            by_slug.setdefault(slug, d)
    return by_name, by_slug


def related_docs_for(citations):
    """Dokumen terkait dari sitasi, tanpa mengulang yang sudah disitir.

    Kembalikan list of {"source": display_name, "domain": domain}.
    """
    if not citations:
        return []
    docs = registry.list_docs()
    if not docs:
        return []
    by_name, by_slug = _indexes(docs)

    def find(name):
        name = (name or "").strip()
        if not name:
            return None
        if name in by_name:
            return by_name[name]
        base = _basename(name)
        if base in by_name:
            return by_name[base]
        return by_slug.get(_slug(name))

    seen = set()
    for c in citations:
        s = _slug(c.get("source") or "")
        if s:
            seen.add(s)

    out = []
    for c in citations:
        doc = find(c.get("source") or "")
        if not doc:
            continue
        for ref in doc.get("related") or []:
            target = find(ref)
            if not target:
                continue
            slug = _slug(target.get("display_name") or target.get("filename") or ref)
            if not slug or slug in seen:
                continue
            seen.add(slug)
            out.append({
                "source": target.get("display_name") or target.get("filename") or ref,
                "domain": target.get("domain") or "",
            })
    return out
