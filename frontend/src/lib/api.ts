/**
 * Satu-satunya tempat frontend berbicara dengan backend.
 *
 * Semua pemanggilan HTTP lewat helper `req()`, jadi penanganan error dan
 * parsing JSON hanya ditulis sekali. Kalau VITE_USE_MOCK=true, panggilan
 * dialihkan ke data palsu di ./mock supaya UI bisa dites tanpa backend.
 */
import * as mock from "./mock";
import type {
  AskResponse,
  AutoSplitResult,
  ChatHistoryTurn,
  DocumentContent,
  DocumentInfo,
  DocumentMeta,
  HealthInfo,
  MetadataSuggestion,
  ModelOption,
  PopularQuestion,
  SettingsInfo,
  Taxonomy,
  TemplateInfo,
} from "./types";

// Diekspor ulang agar komponen cukup import dari "../lib/api".
export type {
  AskResponse,
  AutoSplitResult,
  ChatHistoryTurn,
  Citation,
  DocumentContent,
  DocumentInfo,
  DocumentMeta,
  HealthInfo,
  MetadataSuggestion,
  ModelOption,
  PopularQuestion,
  RelatedDoc,
  SettingsInfo,
  SplitSection,
  Taxonomy,
  TemplateInfo,
  TopicHint,
} from "./types";

// Prioritas: konfigurasi runtime (embed via <script data-api-url>) -> env build -> default.
const RUNTIME_API_URL =
  typeof window !== "undefined"
    ? (window as unknown as Record<string, string | undefined>).__TD_CHATBOT_API_URL
    : undefined;
const API_URL = RUNTIME_API_URL ?? import.meta.env.VITE_API_URL ?? "http://localhost:8000";
const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

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

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, init);
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as T;
}

async function reqVoid(path: string, init?: RequestInit): Promise<void> {
  const res = await fetch(`${API_URL}${path}`, init);
  if (!res.ok) throw new Error(await readError(res));
}

function json(method: string, body: unknown, signal?: AbortSignal): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  };
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
    json("POST", { question, domain: domain || null, topic: topic || null }, signal),
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

  const res = await fetch(`${API_URL}/ask/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question,
      domain: domain || null,
      topic: topic || null,
      history: history ?? [],
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
    await fetch(`${API_URL}/feedback`, json("POST", payload));
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
  return form;
}

function metaBody(meta?: DocumentMeta) {
  return {
    category: meta?.category ?? "",
    domain: meta?.domain ?? "",
    topics: meta?.topics ?? [],
    summary: meta?.summary ?? "",
    related: meta?.related ?? [],
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
