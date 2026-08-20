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
  /** Grup sumber (Smart Upload) untuk fitur auto-hapus bagian lama. */
  source_group?: string;
}

export interface DocumentInfo {
  id: string;
  display_name: string;
  filename: string;
  /** Timestamp terakhir dokumen di-index / diperbarui (ISO-8601 UTC). */
  uploaded_at: string;
  /** Timestamp upload pertama; dipertahankan lintas update. Kosong untuk entri lama. */
  created_at?: string;
  /** Grup sumber (Smart Upload); dipakai fitur auto-hapus bagian lama. */
  source_group?: string;
  /** Siapa yang pertama mengupload dokumen ini (watermark). */
  created_by?: string;
  /** Siapa yang terakhir mengubah dokumen ini (watermark). */
  updated_by?: string;
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

/** Ringkasan satu sesi percakapan (Riwayat Pengguna, sisi admin). */
export interface ChatSessionSummary {
  session_id: string;
  messages: number;
  questions: number;
  first_at: string;
  last_at: string;
  first_question: string;
}

/** Satu pesan dalam log percakapan (detail sesi, sisi admin). */
export interface ChatLogMessage {
  role: "user" | "assistant";
  text: string;
  domain?: string;
  topic?: string;
  created_at: string;
}

/** Satu baris log aktivitas admin (menu Log Aktivitas). */
export interface AuditEvent {
  id: number;
  /** Waktu aksi (ISO-8601 UTC). */
  ts: string;
  /** Username admin pelaku aksi. */
  username: string;
  /** Kode aksi, mis. "document.create", "kb.reset", "settings.update". */
  action: string;
  /** Nama objek yang terpengaruh (mis. nama dokumen). */
  target: string;
  /** ID objek terkait (mis. id dokumen), bila ada. */
  target_id: string;
  /** Detail tambahan spesifik per aksi. */
  details: Record<string, unknown>;
}

/* ------------------------------ Penggunaan API (monitoring konsumen) ------------------------------ */

/** Satu baris pemakaian API (tab Penggunaan API). */
export interface ApiUsageRow {
  id: number;
  /** Waktu panggilan (ISO-8601 UTC). */
  ts: string;
  /** Nama konsumen (tanpa prefiks "api:"), mis. "widget-public". */
  consumer: string;
  /** Kode aksi, mis. "api.ask", "api.ask_stream". */
  action: string;
  /** Endpoint yang dipanggil, mis. "/ask". */
  endpoint: string;
  /** ID sesi terkait, bila ada. */
  session_id: string;
}

/** Ringkasan pemakaian per konsumen (kartu ringkasan). */
export interface ApiUsageConsumer {
  consumer: string;
  count: number;
  last_7d: number;
}

/** Jumlah panggilan API pada satu tanggal (grafik tren harian). */
export interface ApiUsageDay {
  date: string;
  count: number;
}

/** Ringkasan agregat pemakaian API. */
export interface ApiUsageSummary {
  total: number;
  last_24h: number;
  last_7d: number;
  last_30d: number;
  consumers: ApiUsageConsumer[];
  daily: ApiUsageDay[];
}

/** Respons endpoint /admin/api-usage. */
export interface ApiUsageResult {
  summary: ApiUsageSummary;
  rows: ApiUsageRow[];
  total_rows: number;
}

/* ------------------------------ Uji Pencarian (retrieval-only) ------------------------------ */

/** Satu chunk hasil retrieval beserta skor & metadata (panel Uji Pencarian). */
export interface SearchHit {
  rank: number;
  /** Skor kemiripan kosinus (1 - jarak). Umumnya 0..1; makin besar makin mirip. */
  score: number;
  id: string;
  doc_id: string;
  /** Nama tampilan dokumen (dari registry bila ada). */
  source: string;
  doc_name: string;
  chunk_index: number | null;
  domain: string;
  category: string;
  topics: string[];
  approx_tokens: number | null;
  char_count: number;
  text: string;
}

/** Ringkasan filter yang diminta & apakah benar-benar diterapkan. */
export interface SearchDebugFilters {
  domain: string;
  topic: string;
  domain_applied: boolean;
  /** true = filter domain diminta tapi kosong, jadi di-fallback tanpa filter. */
  domain_fallback: boolean;
  topic_applied: boolean;
  topic_fallback: boolean;
}

/** Respons POST /admin/search: daftar chunk + skor untuk divisualisasikan. */
export interface SearchDebugResult {
  /** Pertanyaan asli yang diketik admin. */
  query: string;
  /** Pertanyaan yang benar-benar dipakai untuk embedding (bisa hasil rewrite). */
  search_query: string;
  rewritten: boolean;
  top_k: number;
  /** Jumlah kandidat mentah sebelum dipangkas ke top_k. */
  candidates: number;
  returned: number;
  filters: SearchDebugFilters;
  results: SearchHit[];
}
