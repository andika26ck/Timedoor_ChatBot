"""Pengaturan aplikasi yang bisa diubah dari UI (app_settings.json).

Saat ini: system prompt untuk mengatur gaya/model jawaban AI. Dikelola lewat
menu "Kelola DB" di frontend.
"""
from app.config import settings
from app.jsonstore import JsonStore

DEFAULT_SYSTEM_PROMPT = """Kamu adalah asisten FAQ internal Timedoor Academy untuk tim CS, Admin, Teacher, dan Curriculum Maker. Tugasmu membantu staf memahami dan menggunakan sistem Academy LMS (sisi CMS untuk staf, dan LMS untuk siswa/teacher) berdasarkan knowledge base (KB) resmi.

== SUMBER JAWABAN ==
- Jawab HANYA berdasarkan dokumen yang ditemukan di KB. Jangan memakai pengetahuan umum atau asumsi di luar KB.
- Kamu BOLEH menggabungkan (mensintesis) informasi dari beberapa dokumen KB untuk menjawab pertanyaan troubleshooting atau perbandingan, selama SETIAP fakta benar-benar berasal dari KB.
- JANGAN membuka jawaban dengan menyebut sumber (mis. "Berdasarkan dokumen SOP Chapter 2..."). Nama dokumen sumber sudah otomatis tampil sebagai chip di UI, jadi tidak perlu diulang di dalam kalimat. Sebut nama dokumen HANYA bila benar-benar membantu penanya menelusuri lebih lanjut, dan taruh di akhir sebagai penutup singkat (mis. "Detail lengkapnya ada di SOP Chapter 2").

== KEJUJURAN (PALING PENTING) ==
- Kalau informasi yang diminta TIDAK ADA di KB, katakan terus terang: "Informasi ini belum ada di knowledge base," lalu sarankan eskalasi ke pihak yang tepat. Jangan pernah mengarang penyebab, langkah, angka, nama menu, atau kebijakan.
- Kalau hanya SEBAGIAN yang terdokumentasi, jawab bagian yang ada dan tandai dengan jelas bagian mana yang belum terdokumentasi.
- Untuk jawaban hasil sintesis lintas dokumen (mis. membandingkan dua menu atau merangkai langkah troubleshooting yang tidak tertulis sebagai satu prosedur utuh), beri catatan singkat bahwa jawaban dirangkum dari beberapa dokumen, dan tandai bagian yang sebaiknya dikonfirmasi ke tim produk/teknis.
- Jangan menebak. Lebih baik mengakui keterbatasan daripada memberi informasi yang salah.

== DI LUAR CAKUPAN ==
- Tolak dengan sopan pertanyaan di luar KB atau di luar peranmu, mis.: rekomendasi/perbandingan kompetitor, gaji/HR, keputusan bisnis, opini pribadi, atau hal sensitif. Arahkan ke pihak yang tepat (HR untuk gaji, tim teknis untuk bug/error, admin atau atasan untuk kebijakan).
- Jangan memberi nasihat hukum, finansial, atau medis.
- JANGAN PERNAH menyebutkan kredensial login (username/password) akun apa pun, meskipun kebetulan ada di dokumen KB. Jika penanya butuh akses akun (mis. akun trial atau akun sistem lama), arahkan untuk menghubungi Admin/Regional Manager cabang — jangan pernah menuliskan password-nya di jawaban.

== GAYA JAWABAN ==
- Pakai Bahasa Indonesia yang santai dan akrab, seperti sedang menjelaskan ke teman sendiri. Boleh menyapa dengan "kamu". Tetap ringkas dan jelas, jangan kaku atau terlalu formal. Ikuti bahasa penanya bila ia memakai bahasa lain.
- Gunakan tebal (**...**) SECUKUPNYA untuk menyorot bagian inti/penting saja: kesimpulan utama, nama menu/istilah kunci, atau hal yang wajib diperhatikan penanya. Jangan berlebihan—tebalkan kata/frasa penting, bukan seluruh kalimat atau seluruh paragraf. Jangan pakai format tebal untuk teks biasa.
- Untuk prosedur, gunakan langkah bernomor yang tersusun secara KRONOLOGIS sesuai urutan waktu pengerjaan (langkah yang dilakukan lebih dulu diletakkan lebih atas), dan sebutkan jalur menu yang tepat, mis. "Class > List Class > Action > Schedules > Generate Schedule".
- Pertahankan istilah dan nama menu asli sesuai sistem (mis. Schedule, Absence Class, Attendance, Generate Schedule, Redeem, Pending Product, Meeting Journal). JANGAN menerjemahkannya.
- Langsung ke inti jawaban tanpa preambul atau basa-basi, dan jangan mengulang kembali pertanyaan penanya.
- Skalakan panjang jawaban dengan kompleksitas pertanyaan: pertanyaan sederhana cukup 1-3 kalimat atau beberapa langkah singkat; pertanyaan kompleks (troubleshooting, prosedur bertahap, atau perbandingan) boleh lebih panjang selama tetap padat dan tidak bertele-tele.
- Kalau pertanyaannya ambigu, boleh minta klarifikasi singkat, tetapi tetap utamakan menjawab dengan informasi yang sudah terdokumentasi.
- Bila relevan, tutup dengan langkah lanjutan atau saran eskalasi yang sesuai.
"""

# Model penjawab. Nilai di .env dipakai sebagai default awal; pilihan yang
# disimpan lewat UI mengalahkannya.
DEFAULT_MODEL = settings.gemini_model or "gemini-3.5-flash"

# Model untuk saran metadata dokumen. Sengaja dibedakan dari model penjawab
# supaya fitur "Sarankan (AI)" tidak ikut menghabiskan kuota harian bot
# (free tier: 20 permintaan per hari PER MODEL). Tetap bisa diganti dari UI
# kalau kuota model ini yang justru habis duluan.
DEFAULT_CLASSIFY_MODEL = "gemini-3.5-flash-lite"

# --------------------------- Chunking (ukuran chunk retrieval) ---------------------------
# Engine memotong dokumen jadi chunk sebelum di-embed. Dari semua
# tahap RAG, HANYA dua angka ini yang boleh kita atur:
#   - max_tokens_per_chunk : panjang maksimum satu chunk
#   - max_overlap_tokens   : berapa token yang diulang di chunk berikutnya
# Model embedding, algoritma pemecahan, jumlah chunk yang diambil saat
# retrieval, dan isi vektornya tetap tertutup.
#
# Nilai 0 = jangan kirim chunking_config sama sekali -> Google pakai default
# internalnya (800 / 400). Ini perilaku sebelum patch ini.
CHUNK_MIN_TOKENS = 100
CHUNK_MAX_TOKENS = 4096

DEFAULT_CHUNK_MAX_TOKENS = max(0, int(settings.chunk_max_tokens or 0))
DEFAULT_CHUNK_OVERLAP_TOKENS = max(0, int(settings.chunk_overlap_tokens or 0))

_store = JsonStore("app_settings.json", {})


def _as_int(value, field: str) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        raise ValueError(f"{field} harus berupa angka bulat.") from None


def validate_chunking(max_tokens: int, overlap: int) -> None:
    """Lempar ValueError kalau kombinasi angka chunk tidak masuk akal."""
    if not max_tokens:
        return
    if not CHUNK_MIN_TOKENS <= max_tokens <= CHUNK_MAX_TOKENS:
        raise ValueError(
            f"chunk_max_tokens harus antara {CHUNK_MIN_TOKENS} dan "
            f"{CHUNK_MAX_TOKENS} (dapat {max_tokens})."
        )
    if overlap < 0:
        raise ValueError("chunk_overlap_tokens tidak boleh negatif.")
    if overlap >= max_tokens:
        raise ValueError(
            "chunk_overlap_tokens harus LEBIH KECIL dari chunk_max_tokens "
            f"(dapat overlap={overlap}, max={max_tokens})."
        )


def get_chunking() -> tuple[int, int]:
    """Kembalikan (max_tokens_per_chunk, max_overlap_tokens) yang aktif.

    (0, 0) berarti "ikut default Google" -- app/documents.py tidak akan
    mengirim chunking_config sama sekali.
    """
    data = _read()
    raw_max = data.get("chunk_max_tokens")
    raw_overlap = data.get("chunk_overlap_tokens")

    max_tokens = (
        int(raw_max) if isinstance(raw_max, int) else DEFAULT_CHUNK_MAX_TOKENS
    )
    overlap = (
        int(raw_overlap)
        if isinstance(raw_overlap, int)
        else DEFAULT_CHUNK_OVERLAP_TOKENS
    )

    if max_tokens <= 0:
        return 0, 0

    # Jaga-jaga kalau app_settings.json diedit manual dengan nilai ngawur:
    # jangan bikin upload gagal, cukup rapikan ke rentang yang sah.
    max_tokens = min(max(max_tokens, CHUNK_MIN_TOKENS), CHUNK_MAX_TOKENS)
    overlap = max(0, min(overlap, max_tokens - 1))
    return max_tokens, overlap


def _read() -> dict:
    data = _store.read()
    return data if isinstance(data, dict) else {}


def get_system_prompt() -> str:
    prompt = str(_read().get("system_prompt") or "").strip()
    return prompt or DEFAULT_SYSTEM_PROMPT


def get_model() -> str:
    """Model penjawab yang sedang aktif.

    Dibaca ulang tiap permintaan (bukan sekali saat proses start seperti
    settings.gemini_model), supaya ganti model lewat UI langsung berlaku
    tanpa perlu restart uvicorn.
    """
    return str(_read().get("gemini_model") or "").strip() or DEFAULT_MODEL


def get_classify_model() -> str:
    """Model untuk saran metadata dokumen (app/classify.py)."""
    return str(_read().get("classify_model") or "").strip() or DEFAULT_CLASSIFY_MODEL


def get_settings() -> dict:
    data = _read()
    custom = str(data.get("system_prompt") or "").strip()
    chunk_max, chunk_overlap = get_chunking()
    return {
        "system_prompt": custom or DEFAULT_SYSTEM_PROMPT,
        "default_system_prompt": DEFAULT_SYSTEM_PROMPT,
        "is_custom": bool(custom),
        "model": get_model(),
        "default_model": DEFAULT_MODEL,
        "classify_model": get_classify_model(),
        "default_classify_model": DEFAULT_CLASSIFY_MODEL,
        "chunk_max_tokens": chunk_max,
        "default_chunk_max_tokens": DEFAULT_CHUNK_MAX_TOKENS,
        "chunk_overlap_tokens": chunk_overlap,
        "default_chunk_overlap_tokens": DEFAULT_CHUNK_OVERLAP_TOKENS,
        "chunk_is_custom": bool(chunk_max),
        "chunk_min_allowed": CHUNK_MIN_TOKENS,
        "chunk_max_allowed": CHUNK_MAX_TOKENS,
    }


def update_settings(
    system_prompt: str | None = None,
    model: str | None = None,
    classify_model: str | None = None,
    chunk_max_tokens: int | None = None,
    chunk_overlap_tokens: int | None = None,
) -> dict:
    """Perbarui sebagian setelan sekaligus.

    Field bernilai None = tidak diubah. Field bernilai string kosong = reset
    ke default. Jadi PUT {"model": ""} mengembalikan model ke nilai .env.

    Untuk chunking, angka <= 0 = reset ke default Google. Perubahan chunking
    hanya berlaku untuk dokumen yang di-index SETELAH ini; dokumen lama harus
    di-index ulang (scripts/reset_kb.py lalu scripts/index_documents.py).
    """
    with _store.lock:
        data = _read()
        for key, value in (
            ("system_prompt", system_prompt),
            ("gemini_model", model),
            ("classify_model", classify_model),
        ):
            if value is None:
                continue
            cleaned = str(value).strip()
            if cleaned:
                data[key] = cleaned
            else:
                data.pop(key, None)

        for key, value, label in (
            ("chunk_max_tokens", chunk_max_tokens, "chunk_max_tokens"),
            ("chunk_overlap_tokens", chunk_overlap_tokens, "chunk_overlap_tokens"),
        ):
            if value is None:
                continue
            num = _as_int(value, label)
            if num <= 0:
                data.pop(key, None)
            else:
                data[key] = num

        # Validasi memakai nilai GABUNGAN (yang baru + yang sudah tersimpan),
        # supaya mengubah salah satu angka saja tetap ketahuan kalau bentrok.
        raw_max = data.get("chunk_max_tokens")
        raw_overlap = data.get("chunk_overlap_tokens")
        eff_max = int(raw_max) if isinstance(raw_max, int) else DEFAULT_CHUNK_MAX_TOKENS
        eff_overlap = (
            int(raw_overlap)
            if isinstance(raw_overlap, int)
            else DEFAULT_CHUNK_OVERLAP_TOKENS
        )
        validate_chunking(eff_max, eff_overlap)

        _store.write(data)
    return get_settings()


def set_system_prompt(prompt: str) -> dict:
    """Dipertahankan demi kompatibilitas dengan pemanggil lama."""
    return update_settings(system_prompt=prompt or "")
