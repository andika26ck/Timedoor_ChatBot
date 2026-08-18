/**
 * Bentuk data yang dipertukarkan dengan backend.
 *
 * Dipisah dari api.ts supaya mock.ts bisa ikut memakainya tanpa membuat
 * import melingkar (api.ts -> mock.ts -> api.ts).
 */

export interface Citation {
  source: string;
  snippet?: string;
  /**
   * Nomor / label halaman sumber, mis. 18 atau "18".
   * Backend perlu mengirim field ini agar tampil "Teacher Guide · Hal. 18".
   */
  page?: number | string;
}

/** Level 2: saran "Baca juga", diturunkan dari field dokumen_terkait. */
export interface RelatedDoc {
  source: string;
  domain?: string;
}

/**
 * Petunjuk kalau topik yang dipilih user tidak cocok dengan pertanyaan.
 * Backend mengirim ini sebagai event SSE "topic_hint" hanya bila ada
 * mismatch; kalau pertanyaan normal event ini tidak dikirim sama sekali.
 */
export interface TopicHint {
  /** Topik yang sedang dipilih user saat pertanyaan diajukan. */
  selected_topic: string;
  /** Daftar topik yang lebih sesuai berdasarkan sitasi jawaban. */
  suggested_topics: Array<{ topic: string; domain: string; source: string }>;
}

export interface AskResponse {
  answer: string;
  citations: Citation[];
  /** Opsional supaya tetap kompatibel dengan backend versi lama. */
  related_docs?: RelatedDoc[];
}

/** Satu giliran percakapan yang dikirim ke backend untuk konteks multi-turn. */
export interface ChatHistoryTurn {
  role: "user" | "assistant";
  text: string;
}

/** Metadata akurasi untuk sebuah dokumen (Level 1 & 3 + konvensi nama). */
export interface DocumentMeta {
  category?: string;
  domain?: string;
  topics?: string[];
  summary?: string;
  related?: string[];
}

export interface DocumentInfo {
  id: string;
  display_name: string;
  filename: string;
  uploaded_at: string;
  category: string;
  domain: string;
  topics: string[];
  summary: string;
  related: string[];
}

export interface DocumentContent {
  id: string;
  display_name: string;
  filename: string;
  content: string;
  truncated: boolean;
}

export interface MetadataSuggestion {
  /** Kategori (SOP/RULES/FAQ/GLOSSARY) untuk prefix nama file. */
  category?: string;
  domain: string;
  topics: string[];
  summary: string;
}

/** Satu bagian hasil pemecahan dokumen besar (fitur Upload Pintar). */
export interface SplitSection {
  title: string;
  filename: string;
  category: string;
  domain: string;
  topics: string[];
  summary: string;
  content: string;
  char_count: number;
}

/** Respons POST /documents/auto-split/{text,file}. */
export interface AutoSplitResult {
  source_name: string;
  count: number;
  sections: SplitSection[];
}

export interface Taxonomy {
  categories: string[];
  domains: string[];
  /** Label topik dari dokumen yang sudah ter-index (Level 1). */
  topics: string[];
  /**
   * Peta domain -> daftar topik milik domain itu.
   * Dikirim oleh backend versi baru; frontend menggunakannya agar TopicPicker
   * hanya menampilkan topik yang relevan dengan domain yang dipilih.
   */
  topics_by_domain?: Record<string, string[]>;
}

export interface TemplateInfo {
  id: string;
  text: string;
  created_at: string;
}

export interface PopularQuestion {
  question: string;
  count: number;
}

/** Satu pilihan model di dropdown Kelola DB (GET /models). */
export interface ModelOption {
  name: string;
  display_name: string;
  /** true = berisiko ditolak (mis. 404) atau kurang cocok untuk menjawab. */
  warn: boolean;
}

export interface SettingsInfo {
  system_prompt: string;
  default_system_prompt: string;
  is_custom: boolean;
  /** Model penjawab yang sedang aktif. */
  model: string;
  default_model: string;
  /** Model untuk fitur "Sarankan (AI)" saat menambah dokumen. */
  classify_model: string;
  default_classify_model: string;
}

/** Respons GET /health, dipakai badge status koneksi di header. */
export interface HealthInfo {
  status: string;
  model: string;
  store_configured: boolean;
}
