from pydantic import BaseModel


class ChatTurn(BaseModel):
    """Satu giliran percakapan sebelumnya (untuk fitur multi-turn).

    Dikirim frontend agar bot bisa "mengingat" konteks percakapan. role hanya
    "user" atau "assistant"; text adalah isi pesan apa adanya.
    """

    role: str = "user"
    text: str = ""


class AskRequest(BaseModel):
    question: str
    # Level 3: batasi pencarian ke satu domain (mis. "HR"). Kosong/None = semua.
    domain: str | None = None
    # Level 1: batasi pencarian ke satu label topik. Kosong/None = semua.
    topic: str | None = None
    # Multi-turn: beberapa giliran terakhir percakapan (opsional). Kosong =
    # pertanyaan berdiri sendiri, sama seperti perilaku lama.
    history: list[ChatTurn] = []
    # ID sesi anonim (dibuat di browser). Dipakai untuk mengelompokkan log
    # percakapan pada tracking sisi admin. Kosong/None = tidak dikelompokkan.
    session_id: str | None = None


class Citation(BaseModel):
    source: str
    snippet: str | None = None
    # Nomor / label halaman sumber (mis. 18). None = tidak tersedia; saat
    # terisi, frontend menampilkan label "Hal. <page>" di kartu sumber.
    page: int | str | None = None


class RelatedDoc(BaseModel):
    # Level 2: saran "Baca juga" berdasarkan field dokumen_terkait.
    source: str
    domain: str = ""


class AskResponse(BaseModel):
    answer: str
    citations: list[Citation] = []
    related_docs: list[RelatedDoc] = []


# ------------------------------ Uji Pencarian (retrieval-only) ------------------------------


class SearchDebugRequest(BaseModel):
    """Permintaan panel "Uji Pencarian": jalankan retrieval saja (tanpa LLM)."""

    question: str
    # Level 3: batasi ke satu domain. Kosong/None = semua.
    domain: str | None = None
    # Level 1: batasi ke satu label topik. Kosong/None = semua.
    topic: str | None = None
    # Berapa chunk teratas yang dikembalikan. None/<=0 = default (RAG_TOP_K).
    top_k: int | None = None
    # Multi-turn opsional (untuk uji penulisan ulang pertanyaan).
    history: list[ChatTurn] = []
    # True = tulis ulang pertanyaan lanjutan dulu (butuh history). Default mati.
    condense: bool = False


class SearchHit(BaseModel):
    """Satu chunk hasil retrieval beserta skor & metadata untuk visualisasi."""

    rank: int
    # Skor kemiripan kosinus (1 - jarak). Umumnya 0..1; makin besar makin mirip.
    score: float
    id: str = ""
    doc_id: str = ""
    # Nama tampilan dokumen (dari registry bila ada).
    source: str = ""
    doc_name: str = ""
    chunk_index: int | None = None
    domain: str = ""
    category: str = ""
    topics: list[str] = []
    approx_tokens: int | None = None
    char_count: int = 0
    text: str = ""


class SearchDebugFilters(BaseModel):
    """Ringkasan filter yang diminta & apakah benar-benar diterapkan."""

    domain: str = ""
    topic: str = ""
    domain_applied: bool = False
    # True = filter domain diminta tapi tak ada hasil -> fallback tanpa filter.
    domain_fallback: bool = False
    topic_applied: bool = False
    topic_fallback: bool = False


class SearchDebugResponse(BaseModel):
    # Pertanyaan asli yang diketik admin.
    query: str
    # Pertanyaan yang benar-benar dipakai untuk embedding (bisa hasil rewrite).
    search_query: str
    rewritten: bool = False
    top_k: int
    # Jumlah kandidat mentah sebelum dipangkas ke top_k.
    candidates: int
    returned: int
    filters: SearchDebugFilters
    results: list[SearchHit] = []


class ChatLogMessage(BaseModel):
    """Satu giliran percakapan yang tercatat (detail sesi, sisi admin)."""

    role: str = "user"
    text: str = ""
    domain: str = ""
    topic: str = ""
    created_at: str = ""


class ChatSessionSummary(BaseModel):
    """Ringkasan satu sesi anonim untuk tabel Riwayat Pengguna."""

    session_id: str
    messages: int = 0
    questions: int = 0
    first_at: str = ""
    last_at: str = ""
    first_question: str = ""


class FeedbackRequest(BaseModel):
    """Umpan balik (up/down) dari frontend, dipakai POST /feedback.

    Nama field mengikuti payload frontend (messageId) apa adanya supaya
    kompatibel di pydantic v1 maupun v2 tanpa konfigurasi alias.
    """

    messageId: str = ""
    value: str = "up"  # "up" atau "down"
    question: str | None = None
    answer: str | None = None


class AddTextRequest(BaseModel):
    filename: str
    content: str
    # Metadata akurasi (Level 1 & 3 + konvensi nama). Semua opsional.
    category: str = ""
    domain: str = ""
    topics: list[str] = []
    summary: str = ""
    related: list[str] = []
    # Grup sumber (Smart Upload): dipakai untuk mendeteksi & menghapus bagian
    # lama yang jadi "yatim" saat dokumen sumber yang sama diunggah ulang.
    source_group: str = ""
    # Perilaku bila nama file sudah ada:
    #   "overwrite" (default) = timpa dokumen lama (id & chunk dipakai ulang)
    #   "new"                 = paksa jadi dokumen baru dengan nama unik (-2, -3)
    on_conflict: str = "overwrite"


class DocumentInfo(BaseModel):
    id: str
    display_name: str
    filename: str
    # uploaded_at = timestamp terakhir dokumen di-index / diperbarui.
    uploaded_at: str
    # created_at = timestamp upload pertama, dipertahankan lintas update.
    # Default kosong supaya entri lama (tanpa field ini) tetap valid.
    created_at: str = ""
    # Default kosong supaya entri lama (tanpa metadata) tetap valid.
    category: str = ""
    domain: str = ""
    topics: list[str] = []
    summary: str = ""
    related: list[str] = []
    # Grup sumber (Smart Upload) untuk fitur auto-hapus bagian lama.
    source_group: str = ""


class OrphanScanRequest(BaseModel):
    """Cari bagian lama yang jadi 'yatim' untuk satu grup sumber Smart Upload.

    source_group   = penanda dokumen sumber (mis. nama file besar aslinya).
    keep_filenames = nama file (final) bagian yang BARU saja disimpan; bagian
                     lama di grup yang sama tapi tidak ada di daftar ini
                     dianggap yatim dan bisa dihapus.
    """

    source_group: str = ""
    keep_filenames: list[str] = []


class DocumentContent(BaseModel):
    id: str
    display_name: str
    filename: str
    content: str
    truncated: bool = False


# ------------------------------ Saran metadata (AI) ------------------------------


class MetadataSuggestRequest(BaseModel):
    text: str


class MetadataSuggestion(BaseModel):
    category: str = ""
    domain: str = ""
    topics: list[str] = []
    summary: str = ""


# ------------------------------ Upload Pintar (auto-split) ------------------------------


class AutoSplitTextRequest(BaseModel):
    """Pecah satu dokumen teks besar jadi beberapa sub-dokumen per heading H2/H3."""

    text: str
    filename: str = ""
    classify: bool = True
    level: int = 2  # 2 = pecah per H2 (##), 3 = pecah per H3 (###)


class SplitSectionInfo(BaseModel):
    title: str
    filename: str
    category: str = ""
    domain: str = ""
    topics: list[str] = []
    summary: str = ""
    content: str
    char_count: int = 0


class AutoSplitResponse(BaseModel):
    source_name: str = ""
    count: int
    sections: list[SplitSectionInfo] = []


class ResetResponse(BaseModel):
    deleted: int


class TaxonomyInfo(BaseModel):
    categories: list[str]
    domains: list[str]
    # Level 1: label topik yang benar-benar ada di dokumen ter-index.
    topics: list[str] = []
    # Peta domain -> daftar topik milik domain itu.
    # Dipakai TopicPicker di frontend agar pilihan topik menyesuaikan domain.
    topics_by_domain: dict[str, list[str]] = {}


# ------------------------------ Template ------------------------------


class TemplateInfo(BaseModel):
    id: str
    text: str
    created_at: str


class TemplateRequest(BaseModel):
    text: str


class PopularQuestion(BaseModel):
    question: str
    count: int


# ------------------------------ Kelola DB ------------------------------


class ModelOption(BaseModel):
    name: str
    display_name: str
    # True = model berisiko ditolak (mis. 404) atau kurang cocok untuk menjawab.
    warn: bool = False


class SettingsInfo(BaseModel):
    system_prompt: str
    default_system_prompt: str
    is_custom: bool = False
    # Model penjawab & model saran metadata, plus default masing-masing.
    model: str = ""
    default_model: str = ""
    classify_model: str = ""
    default_classify_model: str = ""
    # Ukuran chunk retrieval. Nilai 0 = ikut default engine.
    chunk_max_tokens: int = 0
    default_chunk_max_tokens: int = 0
    chunk_overlap_tokens: int = 0
    default_chunk_overlap_tokens: int = 0
    chunk_is_custom: bool = False
    chunk_min_allowed: int = 100
    chunk_max_allowed: int = 4096


class SettingsUpdate(BaseModel):
    """Semua field opsional: None = tidak diubah, "" = reset ke default."""

    system_prompt: str | None = None
    model: str | None = None
    classify_model: str | None = None
    # 0 (atau negatif) = reset ke default Google.
    chunk_max_tokens: int | None = None
    chunk_overlap_tokens: int | None = None
