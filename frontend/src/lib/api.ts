/**
 * Satu-satunya tempat frontend berbicara dengan backend.
 *
 * Semua pemanggilan HTTP lewat helper `req()`, jadi penanganan error dan
 * parsing JSON hanya ditulis sekali. Kalau VITE_USE_MOCK=true, panggilan
 * dialihkan ke data palsu di ./mock supaya UI bisa dites tanpa backend.
 */
import * as mock from "./mock";
import { clearToken, getToken, setToken } from "./auth";
import type {
  ApiUsageResult,
  AskResponse,
  AuditEvent,
  AutoSplitResult,
  ChatHistoryTurn,
  ChatLogMessage,
  ChatSessionSummary,
  DocumentContent,
  DocumentInfo,
  DocumentMeta,
  HealthInfo,
  MetadataSuggestion,
  ModelOption,
  PopularQuestion,
  SearchDebugResult,
  SettingsInfo,
  Taxonomy,
  TemplateInfo,
} from "./types";

// Diekspor ulang agar komponen cukup import dari "../lib/api".
export type {
  ApiUsageConsumer,
  ApiUsageDay,
  ApiUsageResult,
  ApiUsageRow,
  ApiUsageSummary,
  AskResponse,
  AuditEvent,
  AutoSplitResult,
  ChatHistoryTurn,
  ChatLogMessage,
  ChatSessionSummary,
  Citation,
  DocumentContent,
  DocumentInfo,
  DocumentMeta,
  HealthInfo,
  MetadataSuggestion,
  ModelOption,
  PopularQuestion,
  RelatedDoc,
  SearchDebugFilters,
  SearchDebugResult,
  SearchHit,
  SettingsInfo,
  SplitSection,
  Taxonomy,
  TemplateInfo,
  TopicHint,
} from "./types";

// Prioritas: konfigurasi runtime (embed via <script data-api-url>) -> env build -> default.
//
// PENTING: nilai dibaca DINAMIS setiap kali dipakai (bukan const sekali di awal).
// Widget menuliskan window.__TD_CHATBOT_API_URL / __TD_CHATBOT_API_KEY di dalam
// mount(), yang berjalan SETELAH modul ini selesai di-load. Kalau ditangkap sekali
// di awal, nilai dari atribut data-* akan selalu kosong -> header X-API-Key tidak
// pernah terkirim -> backend menolak dengan 401.
function getApiUrl(): string {
  const runtime =
    typeof window !== "undefined"
      ? (window as unknown as Record<string, string | undefined>).__TD_CHATBOT_API_URL
      : undefined;
  return runtime ?? import.meta.env.VITE_API_URL ?? "http://localhost:8000";
}

const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

// API key opsional untuk konsumsi API dari luar (widget/CMS). Prioritas sama
// seperti API URL: runtime (embed via <script data-api-key>) -> env build ->
// kosong. Kosong = header tidak dikirim (perilaku lama untuk dashboard admin).
function getApiKey(): string {
  const runtime =
    typeof window !== "undefined"
      ? (window as unknown as Record<string, string | undefined>).__TD_CHATBOT_API_KEY
      : undefined;
  return runtime ?? import.meta.env.VITE_API_KEY ?? "";
}

/** Header X-API-Key bila API key diset; objek kosong = tidak dikirim. */
function apiKeyHeader(): Record<string, string> {
  const key = getApiKey();
  return key ? { "X-API-Key": key } : {};
}

/**
 * Identitas user dari CMS (opsional), bila embed menyertakan data-user-id /
 * data-user-name / data-user-email. Dikirim apa adanya di body /ask &
 * /ask/stream untuk pelabelan riwayat admin (BUKAN autentikasi). Kosong = anonim.
 */
function getUserFields(): {
  user_id: string | null;
  user_name: string | null;
  user_email: string | null;
} {
  const w =
    typeof window !== "undefined"
      ? (window as unknown as Record<string, string | undefined>)
      : ({} as Record<string, string | undefined>);
  const pick = (runtime: string | undefined, env: string | undefined) =>
    (runtime ?? env ?? "").trim() || null;
  return {
    user_id: pick(w.__TD_CHATBOT_USER_ID, import.meta.env.VITE_USER_ID),
    user_name: pick(w.__TD_CHATBOT_USER_NAME, import.meta.env.VITE_USER_NAME),
    user_email: pick(w.__TD_CHATBOT_USER_EMAIL, import.meta.env.VITE_USER_EMAIL),
  };
}

/**
 * ID sesi anonim per-browser. Dikirim bersama tiap pertanyaan agar admin bisa
 * mengelompokkan percakapan di halaman Riwayat Pengguna. Tidak ada data
 * pribadi — hanya penanda acak yang disimpan di localStorage.
 */
const SESSION_KEY = "tdc:session-id";
function getSessionId(): string {
  if (typeof window === "undefined") return "anon";
  try {
    let sid = window.localStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid =
        (typeof crypto !== "undefined" && crypto.randomUUID?.()) ||
        `s-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      window.localStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  } catch {
    return "anon";
  }
}

/**
 * Fallback kalau endpoint /taxonomy tidak terjangkau.
 * Harus sama persis dengan backend/app/taxonomy.py.
 */
export const CATEGORIES = ["SOP", "RULES", "FAQ", "GLOSSARY"];
export const DOMAINS = [
  "Tentang Sistem",
  "CMS Admin",
  "Teacher",
  "Curriculum Maker",
  "System Rules",
  "Akun & Akses",
  "Known Risks",
];

/* ------------------------------ Helper HTTP ------------------------------ */

async function readError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (typeof data?.detail === "string") return data.detail;
  } catch {
    /* bukan JSON */
  }
  return `Gagal menghubungi server (${res.status})`;
}

/** Sisipkan header Authorization bila ada token admin tersimpan. */
function withAuth(init?: RequestInit): RequestInit {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(init?.headers as Record<string, string> | undefined),
    ...apiKeyHeader(),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return { ...init, headers };
}

/** Token ditolak server (401): bersihkan sesi & minta UI login ulang. */
function handleUnauthorized(): void {
  clearToken();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("tdc:unauthorized"));
  }
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${getApiUrl()}${path}`, withAuth(init));
  if (res.status === 401) {
    handleUnauthorized();
    throw new Error(await readError(res));
  }
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as T;
}

async function reqVoid(path: string, init?: RequestInit): Promise<void> {
  const res = await fetch(`${getApiUrl()}${path}`, withAuth(init));
  if (res.status === 401) {
    handleUnauthorized();
    throw new Error(await readError(res));
  }
  if (!res.ok) throw new Error(await readError(res));
}

function json(method: string, body: unknown, signal?: AbortSignal): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json", ...apiKeyHeader() },
    body: JSON.stringify(body),
    signal,
  };
}

/* ------------------------------ Autentikasi (admin) ------------------------------ */

export interface AdminUser {
  username: string;
  role: string;
  created_at?: string | null;
  name?: string | null;
}

/** Login admin: simpan token bila berhasil, kembalikan info user. */
export async function login(username: string, password: string): Promise<AdminUser> {
  const res = await fetch(`${getApiUrl()}/auth/login`, json("POST", { username, password }));
  if (!res.ok) throw new Error(await readError(res));
  const data = (await res.json()) as { access_token: string; user: AdminUser };
  setToken(data.access_token);
  return data.user;
}

/** Registrasi mandiri end-user chatbot (role="user"): simpan token bila berhasil. */
export async function registerUser(
  name: string,
  email: string,
  password: string,
): Promise<AdminUser> {
  const res = await fetch(
    `${getApiUrl()}/auth/register`,
    json("POST", { name, email, password }),
  );
  if (!res.ok) throw new Error(await readError(res));
  const data = (await res.json()) as { access_token: string; user: AdminUser };
  setToken(data.access_token);
  return data.user;
}

/** Verifikasi token saat ini & ambil user aktif. */
export async function fetchMe(): Promise<AdminUser> {
  const data = await req<{ user: AdminUser }>("/auth/me");
  return data.user;
}

/** Hapus token lokal (keluar). */
export function logout(): void {
  clearToken();
}

/* ------------------------------ Health ------------------------------ */

export async function getHealth(): Promise<HealthInfo> {
  if (USE_MOCK) return mock.health();
  return req<HealthInfo>("/health");
}

/* ------------------------------ Chat ------------------------------ */

export async function askQuestion(
  question: string,
  domain?: string,
  topic?: string,
  signal?: AbortSignal,
): Promise<AskResponse> {
  if (USE_MOCK) return mock.answer(question);
  return req<AskResponse>(
    "/ask",
    json(
      "POST",
      {
        question,
        domain: domain || null,
        topic: topic || null,
        session_id: getSessionId(),
        ...getUserFields(),
      },
      signal,
    ),
  );
}

/**
 * Handler untuk streaming jawaban.
 * `onTopicHint` dipanggil bila backend mendeteksi mismatch topik.
 * Pada pertanyaan normal (topik cocok / tidak ada filter topik) event ini
 * tidak dikirim sama sekali, jadi tidak ada overhead kuota.
 */
export type AskStreamHandlers = {
  onText: (chunk: string) => void;
  onCitations: (citations: AskResponse["citations"]) => void;
  onRelated?: (related: NonNullable<AskResponse["related_docs"]>) => void;
  onTopicHint?: (hint: import("./types").TopicHint) => void;
};

export async function askQuestionStream(
  question: string,
  domain: string | undefined,
  topic: string | undefined,
  history: ChatHistoryTurn[],
  handlers: AskStreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  if (USE_MOCK) {
    const res = await mock.answer(question);
    handlers.onText(res.answer);
    handlers.onCitations(res.citations ?? []);
    handlers.onRelated?.(res.related_docs ?? []);
    return;
  }

  const streamHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...apiKeyHeader(),
  };
  const streamToken = getToken();
  if (streamToken) streamHeaders.Authorization = `Bearer ${streamToken}`;

  const res = await fetch(`${getApiUrl()}/ask/stream`, {
    method: "POST",
    headers: streamHeaders,
    body: JSON.stringify({
      question,
      domain: domain || null,
      topic: topic || null,
      history: history ?? [],
      session_id: getSessionId(),
      ...getUserFields(),
    }),
    signal,
  });

  if (!res.ok || !res.body) {
    let detail = `Permintaan gagal (HTTP ${res.status})`;
    try {
      const body = await res.json();
      if (body?.detail) detail = String(body.detail);
    } catch {
      /* bukan JSON */
    }
    throw new Error(detail);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      const line = part.trim();
      if (!line.startsWith("data:")) continue;
      const raw = line.slice(5).trim();
      if (!raw) continue;

      let ev: { type?: string; value?: unknown };
      try {
        ev = JSON.parse(raw);
      } catch {
        continue;
      }

      if (ev.type === "text" && typeof ev.value === "string") {
        handlers.onText(ev.value);
      } else if (ev.type === "citations") {
        handlers.onCitations((ev.value as AskResponse["citations"]) ?? []);
      } else if (ev.type === "related") {
        handlers.onRelated?.((ev.value as NonNullable<AskResponse["related_docs"]>) ?? []);
      } else if (ev.type === "topic_hint") {
        handlers.onTopicHint?.(ev.value as import("./types").TopicHint);
      } else if (ev.type === "error") {
        throw new Error(typeof ev.value === "string" ? ev.value : "Gagal memproses pertanyaan.");
      }
    }
  }
}

/* --------------------------- Uji Pencarian (retrieval-only) --------------------------- */

/**
 * Jalankan tahap retrieval SAJA (tanpa jawaban LLM) untuk panel "Uji Pencarian".
 * Mengembalikan daftar chunk terurut skor + metadata untuk divisualisasikan.
 */
export async function debugSearch(params: {
  question: string;
  domain?: string;
  topic?: string;
  topK?: number;
}): Promise<SearchDebugResult> {
  if (USE_MOCK)
    return mock.debugSearch(params.question, params.domain, params.topic, params.topK);
  return req<SearchDebugResult>(
    "/admin/search",
    json("POST", {
      question: params.question,
      domain: params.domain || null,
      topic: params.topic || null,
      top_k: params.topK ?? null,
    }),
  );
}

/* ------------------------------ Feedback ------------------------------ */

export interface FeedbackPayload {
  messageId: string;
  value: "up" | "down";
  question?: string;
  answer?: string;
}

/**
 * Kirim umpan balik 👍/👎 untuk sebuah jawaban.
 * Fire-and-forget: kegagalan (mis. endpoint belum ada) diabaikan diam-diam
 * agar tidak mengganggu UX. Aktifkan endpoint POST /feedback di backend
 * untuk mulai merekamnya.
 */
export async function sendFeedback(payload: FeedbackPayload): Promise<void> {
  if (USE_MOCK) return;
  try {
    await fetch(`${getApiUrl()}/feedback`, json("POST", payload));
  } catch {
    /* diabaikan */
  }
}

/* ------------------------------ Taksonomi ------------------------------ */

export async function getTaxonomy(): Promise<Taxonomy> {
  const fallback: Taxonomy = {
    categories: CATEGORIES,
    domains: DOMAINS,
    topics: [],
    topics_by_domain: {},
  };
  if (USE_MOCK) return fallback;
  try {
    return await req<Taxonomy>("/taxonomy");
  } catch {
    return fallback;
  }
}

/* --------------------------- Saran metadata (AI) --------------------------- */

export async function suggestMetadata(text: string): Promise<MetadataSuggestion> {
  if (USE_MOCK) return mock.suggest(text);
  return req<MetadataSuggestion>("/metadata/suggest", json("POST", { text }));
}

/* --------------------------- Dokumen (CRUD) --------------------------- */

function metaForm(file: File, meta?: DocumentMeta): FormData {
  const form = new FormData();
  form.append("file", file);
  form.append("category", meta?.category ?? "");
  form.append("domain", meta?.domain ?? "");
  form.append("topics", (meta?.topics ?? []).join(", "));
  form.append("summary", meta?.summary ?? "");
  form.append("related", (meta?.related ?? []).join(", "));
  form.append("source_group", meta?.source_group ?? "");
  return form;
}

function metaBody(meta?: DocumentMeta) {
  return {
    category: meta?.category ?? "",
    domain: meta?.domain ?? "",
    topics: meta?.topics ?? [],
    summary: meta?.summary ?? "",
    related: meta?.related ?? [],
    source_group: meta?.source_group ?? "",
  };
}

/** Prediksi nama file final (prefix kategori + ekstensi) — sama seperti backend. */
export function predictFilename(filename: string, category = ""): string {
  let name = filename.trim();
  const cat = category.trim();
  if (cat && !name.toUpperCase().startsWith(`${cat.toUpperCase()}_`)) {
    name = `${cat}_${name}`;
  }
  if (!/\.(md|txt)$/i.test(name)) name += ".md";
  return name;
}

export async function listDocuments(): Promise<DocumentInfo[]> {
  if (USE_MOCK) return mock.list();
  return req<DocumentInfo[]>("/documents");
}

export async function getDocumentContent(id: string): Promise<DocumentContent> {
  if (USE_MOCK) return mock.content(id);
  return req<DocumentContent>(`/documents/${id}/content`);
}

export async function createDocumentFile(file: File, meta?: DocumentMeta): Promise<DocumentInfo> {
  if (USE_MOCK) return mock.create(file.name, meta);
  return req<DocumentInfo>("/documents/file", { method: "POST", body: metaForm(file, meta) });
}

export async function createDocumentText(
  filename: string,
  content: string,
  meta?: DocumentMeta,
  onConflict: "overwrite" | "new" = "overwrite",
): Promise<DocumentInfo> {
  if (USE_MOCK) return mock.create(filename, meta);
  return req<DocumentInfo>(
    "/documents/text",
    json("POST", { filename, content, on_conflict: onConflict, ...metaBody(meta) }),
  );
}

export async function updateDocumentFile(
  id: string,
  file: File,
  meta?: DocumentMeta,
): Promise<DocumentInfo> {
  if (USE_MOCK) return mock.update(id, file.name, meta);
  return req<DocumentInfo>(`/documents/${id}/file`, { method: "PUT", body: metaForm(file, meta) });
}

export async function updateDocumentText(
  id: string,
  filename: string,
  content: string,
  meta?: DocumentMeta,
): Promise<DocumentInfo> {
  if (USE_MOCK) return mock.update(id, filename, meta);
  return req<DocumentInfo>(
    `/documents/${id}/text`,
    json("PUT", { filename, content, ...metaBody(meta) }),
  );
}

export async function deleteDocument(id: string): Promise<void> {
  if (USE_MOCK) return mock.remove(id);
  return reqVoid(`/documents/${id}`, { method: "DELETE" });
}

/**
 * Cari bagian lama (yatim) untuk satu grup sumber Smart Upload.
 * `keepFilenames` = nama file final bagian yang baru saja disimpan.
 */
export async function scanOrphans(
  sourceGroup: string,
  keepFilenames: string[],
): Promise<DocumentInfo[]> {
  if (USE_MOCK) return mock.scanOrphans(sourceGroup, keepFilenames);
  return req<DocumentInfo[]>(
    "/documents/orphans",
    json("POST", { source_group: sourceGroup, keep_filenames: keepFilenames }),
  );
}

/* --------------------------- Upload Pintar (auto-split) --------------------------- */

/** Pecah 1 teks besar jadi beberapa bagian per heading H2 (pratinjau, tidak menyimpan). */
export async function autoSplitText(
  text: string,
  filename = "",
  classify = true,
  level = 2,
): Promise<AutoSplitResult> {
  if (USE_MOCK) return mock.autoSplit(text, filename, level);
  return req<AutoSplitResult>(
    "/documents/auto-split/text",
    json("POST", { text, filename, classify, level }),
  );
}

/** Sama seperti autoSplitText, tapi sumbernya file (PDF/DOCX/MD/TXT). */
export async function autoSplitFile(
  file: File,
  classify = true,
  level = 2,
): Promise<AutoSplitResult> {
  if (USE_MOCK) return mock.autoSplit(await file.text().catch(() => ""), file.name, level);
  const form = new FormData();
  form.append("file", file);
  form.append("classify", String(classify));
  form.append("level", String(level));
  return req<AutoSplitResult>("/documents/auto-split/file", { method: "POST", body: form });
}

/** Kosongkan SELURUH knowledge base (dokumen + indeks). Kembalikan jumlah dokumen terhapus. */
export async function resetKnowledgeBase(): Promise<{ deleted: number }> {
  if (USE_MOCK) return mock.resetKb();
  return req<{ deleted: number }>("/documents/reset", { method: "POST" });
}

/* --------------------------- Template (CRUD) --------------------------- */

export async function listTemplates(): Promise<TemplateInfo[]> {
  if (USE_MOCK) return mock.templateList();
  return req<TemplateInfo[]>("/templates");
}

export async function createTemplate(text: string): Promise<TemplateInfo> {
  if (USE_MOCK) return mock.templateCreate(text);
  return req<TemplateInfo>("/templates", json("POST", { text }));
}

export async function updateTemplate(id: string, text: string): Promise<TemplateInfo> {
  if (USE_MOCK) return mock.templateUpdate(id, text);
  return req<TemplateInfo>(`/templates/${id}`, json("PUT", { text }));
}

export async function deleteTemplate(id: string): Promise<void> {
  if (USE_MOCK) return mock.templateRemove(id);
  return reqVoid(`/templates/${id}`, { method: "DELETE" });
}

/* --------------------- Pertanyaan populer (dinamis) --------------------- */

export async function getPopularQuestions(limit = 6): Promise<PopularQuestion[]> {
  if (USE_MOCK) return mock.popular(limit);
  return req<PopularQuestion[]>(`/stats/popular?limit=${limit}`);
}

/* --------------------------- Kelola DB (settings) --------------------------- */

export async function getSettings(): Promise<SettingsInfo> {
  if (USE_MOCK) return mock.getSettings();
  return req<SettingsInfo>("/settings");
}

/**
 * Perubahan sebagian untuk PUT /settings.
 * Field yang tidak diisi = tidak diubah. String kosong = reset ke default.
 */
export interface SettingsPatch {
  system_prompt?: string;
  model?: string;
  classify_model?: string;
}

export async function updateSettings(patch: SettingsPatch): Promise<SettingsInfo> {
  if (USE_MOCK) return mock.updateSettings(patch);
  return req<SettingsInfo>("/settings", json("PUT", patch));
}

/** Daftar model teks yang tersedia untuk dropdown pemilihan model. */
export async function listModels(refresh = false): Promise<ModelOption[]> {
  if (USE_MOCK) return mock.listModels();
  return req<ModelOption[]>(`/models${refresh ? "?refresh=true" : ""}`);
}

/* --------------------------- Riwayat Pengguna (admin) --------------------------- */

/** Ringkasan sesi percakapan (anonim) untuk tabel Riwayat Pengguna. */
export async function getChatSessions(params?: {
  limit?: number;
  offset?: number;
  since?: string;
  until?: string;
}): Promise<ChatSessionSummary[]> {
  if (USE_MOCK) return [];
  const q = new URLSearchParams();
  if (params?.limit) q.set("limit", String(params.limit));
  if (params?.offset) q.set("offset", String(params.offset));
  if (params?.since) q.set("since", params.since);
  if (params?.until) q.set("until", params.until);
  const qs = q.toString();
  return req<ChatSessionSummary[]>(`/admin/chat-logs/sessions${qs ? `?${qs}` : ""}`);
}

/** Semua pesan dalam satu sesi, urut waktu. */
export async function getChatSession(sessionId: string): Promise<ChatLogMessage[]> {
  if (USE_MOCK) return [];
  return req<ChatLogMessage[]>(`/admin/chat-logs/sessions/${encodeURIComponent(sessionId)}`);
}

/* --------------------------- Log Aktivitas (admin) --------------------------- */

/** Daftar aksi admin (upload/edit/hapus/setelan), terbaru di atas. */
export async function getAuditLogs(params?: {
  limit?: number;
  offset?: number;
  since?: string;
  until?: string;
  action?: string;
  username?: string;
}): Promise<AuditEvent[]> {
  if (USE_MOCK) return [];
  const q = new URLSearchParams();
  if (params?.limit) q.set("limit", String(params.limit));
  if (params?.offset) q.set("offset", String(params.offset));
  if (params?.since) q.set("since", params.since);
  if (params?.until) q.set("until", params.until);
  if (params?.action) q.set("action", params.action);
  if (params?.username) q.set("username", params.username);
  const qs = q.toString();
  return req<AuditEvent[]>(`/admin/audit-logs${qs ? `?${qs}` : ""}`);
}

/* --------------------------- Penggunaan API (monitoring) --------------------------- */

/** Ringkasan + tabel pemakaian API per konsumen (tab Penggunaan API). */
export async function getApiUsage(params?: {
  limit?: number;
  offset?: number;
  consumer?: string;
  since?: string;
  until?: string;
  days?: number;
}): Promise<ApiUsageResult> {
  if (USE_MOCK) {
    return { summary: { total: 0, last_24h: 0, last_7d: 0, last_30d: 0, consumers: [], daily: [] }, rows: [], total_rows: 0 };
  }
  const q = new URLSearchParams();
  if (params?.limit) q.set("limit", String(params.limit));
  if (params?.offset) q.set("offset", String(params.offset));
  if (params?.consumer) q.set("consumer", params.consumer);
  if (params?.since) q.set("since", params.since);
  if (params?.until) q.set("until", params.until);
  if (params?.days) q.set("days", String(params.days));
  const qs = q.toString();
  return req<ApiUsageResult>(`/admin/api-usage${qs ? `?${qs}` : ""}`);
}

/* --------------------------- Kelola User (admin) --------------------------- */

/** Daftar semua akun (admin & end-user chatbot). */
export async function listUsers(): Promise<AdminUser[]> {
  return req<AdminUser[]>("/users");
}

/** Buat akun baru. Bila username sudah ada, password & role diperbarui. */
export async function createUser(
  username: string,
  password: string,
  role: "user" | "admin" = "user",
  name = "",
): Promise<AdminUser> {
  return req<AdminUser>("/users", json("POST", { username, password, role, name }));
}

/** Reset password akun tertentu (khusus admin). */
export async function resetUserPassword(
  username: string,
  password: string,
): Promise<void> {
  await req<{ status: string }>(
    `/users/${encodeURIComponent(username)}/password`,
    json("POST", { password }),
  );
}

/** Hapus akun. */
export async function deleteUser(username: string): Promise<void> {
  return reqVoid(`/users/${encodeURIComponent(username)}`, { method: "DELETE" });
}
