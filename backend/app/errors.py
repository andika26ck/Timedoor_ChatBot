"""Menerjemahkan error mentah (terutama dari Gemini) menjadi pesan yang mudah
dipahami user, plus HTTP status yang sesuai.

Semua aturan disimpan di satu tabel `_RULES`, jadi kalau mau menambah jenis
error baru cukup tambah satu baris di sana (tidak perlu edit dua fungsi).
"""

# (kata kunci pencocok, http status, pesan ramah).
# pesan None artinya pakai pesan asli exception (sudah ramah dari sumbernya).
_RULES: list[tuple[tuple[str, ...], int, str | None]] = [
    (
        ("503", "unavailable", "overloaded", "high demand"),
        503,
        "Server AI Gemini sedang sibuk/overload (kode 503). Ini masalah "
        "sementara di sisi Google, bukan pada data atau dokumenmu. "
        "Coba kirim lagi dalam beberapa detik.",
    ),
    (
        ("429", "resource_exhausted", "quota", "rate limit", "rate_limit"),
        429,
        "Kuota atau rate limit Gemini terlampaui (kode 429). Tunggu sebentar "
        "lalu coba lagi, atau cek kuota API key kamu (free tier lebih cepat "
        "kena batas).",
    ),
    (
        ("api key", "api_key", "401", "unauthenticated", "invalid authentication"),
        401,
        "API key Gemini tidak valid atau belum diset. Cek nilai "
        "GEMINI_API_KEY di file backend/.env.",
    ),
    (
        ("403", "permission"),
        403,
        "Akses ke Gemini ditolak (kode 403). Cek apakah API key aktif dan "
        "punya izin memakai model Gemini.",
    ),
    (
        ("404", "not_found", "no longer available", "is not found"),
        404,
        "Model Gemini yang dipilih tidak tersedia untuk API key ini (kode 404). "
        "Cek GEMINI_MODEL di backend/.env - model generasi lama seperti "
        "gemini-2.5-* sering tidak bisa dipakai project baru. Lihat daftar "
        "model yang tersedia dengan client.models.list().",
    ),
    (
        ("timeout", "timed out", "deadline"),
        504,
        "Permintaan ke Gemini timeout. Jaringan mungkin lambat atau server "
        "sedang sibuk. Coba lagi sebentar.",
    ),
    # RuntimeError dari rag.py / config.py pesannya sudah ramah -> pakai apa adanya
    (("knowledge base", "kb masih kosong", "gemini_api_key belum diisi"), 400, None),
]


def explain(exc: Exception) -> tuple[int, str]:
    """Kembalikan (http_status, pesan_ramah) untuk sebuah exception."""
    raw = str(exc)
    low = raw.lower()
    for keywords, status, message in _RULES:
        if any(k in low for k in keywords):
            return status, message or raw
    return 500, f"Terjadi kesalahan saat memproses permintaan: {raw}"
