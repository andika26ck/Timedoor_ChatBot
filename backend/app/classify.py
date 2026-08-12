"""Saran metadata otomatis (kategori, domain, topik, ringkasan) memakai Gemini.

Dipakai fitur \"Sarankan (AI)\" saat menambah dokumen. Input manual tetap jadi
keputusan akhir user; ini hanya membantu mengisi lebih cepat.
"""
import json
import logging

from google.genai import types

from app.settings_store import get_classify_model
from app.store import client
from app.taxonomy import CATEGORIES, DOMAINS

logger = logging.getLogger("faq-bot")

_MAX_INPUT = 6000


def suggest_metadata(text: str) -> dict:
    """Minta Gemini menyarankan kategori + domain + topik + ringkasan dari isi."""
    snippet = text[:_MAX_INPUT]
    prompt = (
        "Kamu membantu menata knowledge base FAQ internal.\n"
        "Analisis dokumen di bawah, lalu tentukan:\n"
        f"1. category: pilih SATU dari daftar ini persis: {', '.join(CATEGORIES)}.\n"
        f"2. domain: pilih SATU dari daftar ini persis: {', '.join(DOMAINS)}.\n"
        "3. topics: 1-4 label topik singkat huruf kecil (mis. cuti, remote).\n"
        "4. summary: ringkasan 1 kalimat singkat.\n"
        "Jawab HANYA JSON valid tanpa penjelasan, bentuk:\n"
        '{"category": "...", "domain": "...", "topics": ["..."], "summary": "..."}\n\n'
        f"Dokumen:\n{snippet}"
    )
    resp = client.models.generate_content(
        model=get_classify_model(),
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json"
        ),
    )
    return _parse(resp.text or "")


def _parse(raw: str) -> dict:
    raw = raw.strip()
    data: dict = {}
    try:
        parsed = json.loads(raw)
        if isinstance(parsed, dict):
            data = parsed
    except json.JSONDecodeError:
        # kadang model membungkus JSON dengan teks lain; ambil bagian { ... }
        start, end = raw.find("{"), raw.rfind("}")
        if start != -1 and end != -1 and end > start:
            try:
                parsed = json.loads(raw[start : end + 1])
                if isinstance(parsed, dict):
                    data = parsed
            except json.JSONDecodeError:
                logger.warning("Gagal parse saran metadata dari model.")

    category = str(data.get("category") or "").strip().upper()
    if category not in CATEGORIES:
        category = ""

    domain = str(data.get("domain") or "").strip()
    if domain not in DOMAINS:
        domain = ""

    topics_raw = data.get("topics") or []
    if not isinstance(topics_raw, list):
        topics_raw = []
    topics: list[str] = []
    for t in topics_raw:
        s = str(t).strip().lower()
        if s and s not in topics:
            topics.append(s)
    topics = topics[:4]

    summary = str(data.get("summary") or "").strip()
    return {
        "category": category,
        "domain": domain,
        "topics": topics,
        "summary": summary,
    }
