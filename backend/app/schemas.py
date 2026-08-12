from pydantic import BaseModel


class AskRequest(BaseModel):
    question: str
    # Level 3: batasi pencarian ke satu domain (mis. "HR"). Kosong/None = semua.
    domain: str | None = None
    # Level 1: batasi pencarian ke satu label topik. Kosong/None = semua.
    topic: str | None = None


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
    # Perilaku bila nama file sudah ada:
    #   "overwrite" (default) = timpa dokumen lama (id & chunk dipakai ulang)
    #   "new"                 = paksa jadi dokumen baru dengan nama unik (-2, -3)
    on_conflict: str = "overwrite"


class DocumentInfo(BaseModel):
    id: str
    display_name: str
    filename: str
    uploaded_at: str
    # Default kosong supaya entri lama (tanpa metadata) tetap valid.
    category: str = ""
    domain: str = ""
    topics: list[str] = []
    summary: str = ""
    related: list[str] = []


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
