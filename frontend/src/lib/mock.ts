/**
 * Data & respons palsu untuk mode mock (VITE_USE_MOCK=true).
 *
 * Gunanya supaya frontend bisa dikerjakan dan dites tampilannya tanpa
 * menjalankan backend sama sekali. Semua isinya sengaja memakai contoh nyata
 * Timedoor Academy agar UI-nya terasa seperti kondisi asli.
 */
import type {
  AskResponse,
  AutoSplitResult,
  DocumentContent,
  DocumentInfo,
  DocumentMeta,
  HealthInfo,
  MetadataSuggestion,
  PopularQuestion,
  SearchDebugResult,
  SettingsInfo,
  TemplateInfo,
} from "./types";

/* ------------------------------ Health ------------------------------ */

export async function health(): Promise<HealthInfo> {
  await delay(200);
  return { status: "ok", model: "mock", store_configured: true };
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function nowIso() {
  return new Date().toISOString().slice(0, 19);
}

/* ------------------------------ Dokumen ------------------------------ */

let documents: DocumentInfo[] = [
  {
    id: "mock-1",
    display_name: "SOP_CMS_Admin.md",
    filename: "SOP_CMS_Admin.md",
    uploaded_at: nowIso(),
    category: "SOP",
    domain: "CMS Admin",
    topics: ["invoice", "status siswa"],
    summary: "Prosedur harian admin di CMS: kelola siswa, invoice, dan kelas.",
    related: [],
  },
  {
    id: "mock-2",
    display_name: "RULES_System_Rules.md",
    filename: "RULES_System_Rules.md",
    uploaded_at: nowIso(),
    category: "RULES",
    domain: "System Rules",
    topics: ["prioritas status"],
    summary: "Aturan sistem: urutan prioritas status siswa dan efek sampingnya.",
    related: ["SOP_CMS_Admin.md"],
  },
];

export async function answer(question: string): Promise<AskResponse> {
  await delay(600);
  bumpPopular(question);
  return {
    answer:
      `[MOCK] Ini jawaban contoh untuk: "${question}". ` +
      "Backend belum tersambung, jadi respons ini dummy untuk uji tampilan UI. " +
      "Set VITE_USE_MOCK=false di .env untuk memakai backend asli. " +
      "Paragraf tambahan ini sengaja dibuat panjang supaya fitur detail berlapis " +
      "bisa dites di mode mock: jawaban yang melebihi batas akan diringkas dulu, " +
      "lalu bisa dibuka penuh lewat tombol Lihat selengkapnya. Silakan klik tombol " +
      "itu untuk memastikan teks memanjang dan menciut sesuai harapan, termasuk saat " +
      "ada chip sitasi dan chip Baca juga di bawah jawaban ini.",
    citations: [
      {
        source: "SOP_CMS_Admin.md",
        snippet: "Cuplikan dokumen contoh untuk menguji tampilan sitasi.",
      },
      { source: "RULES_System_Rules.md" },
    ],
    related_docs: [
      { source: "SOP_cms_03_order-product.md", domain: "CMS Admin" },
      { source: "SOP_cms_05_accounting-management.md", domain: "CMS Admin" },
    ],
  };
}

export async function suggest(text: string): Promise<MetadataSuggestion> {
  await delay(500);
  const low = text.toLowerCase();
  const domain =
    low.includes("invoice") || low.includes("siswa")
      ? "CMS Admin"
      : low.includes("journal") || low.includes("report")
        ? "Teacher"
        : low.includes("login") || low.includes("password")
          ? "Akun & Akses"
          : "System Rules";
  return {
    category: "FAQ",
    domain,
    topics: ["contoh", "mock"],
    summary: "Ringkasan contoh hasil saran AI (mode mock).",
  };
}

export async function list(): Promise<DocumentInfo[]> {
  await delay(300);
  return [...documents];
}

export async function content(id: string): Promise<DocumentContent> {
  await delay(300);
  const doc = documents.find((d) => d.id === id);
  return {
    id,
    display_name: doc?.display_name ?? "(tidak diketahui)",
    filename: doc?.filename ?? "",
    content:
      "[MOCK] Ini isi contoh dokumen. Di mode nyata, teks asli file " +
      "(PDF/DOCX/MD/TXT) akan diekstrak dan ditampilkan di sini.",
    truncated: false,
  };
}

export async function create(name: string, meta?: DocumentMeta): Promise<DocumentInfo> {
  await delay(600);
  const cat = meta?.category ?? "";
  const display = cat && !name.toUpperCase().startsWith(`${cat}_`) ? `${cat}_${name}` : name;
  const ts = nowIso();
  const doc: DocumentInfo = {
    id: crypto.randomUUID(),
    display_name: display,
    filename: display,
    created_at: ts,
    uploaded_at: ts,
    category: cat,
    domain: meta?.domain ?? "",
    topics: meta?.topics ?? [],
    summary: meta?.summary ?? "",
    related: meta?.related ?? [],
    source_group: meta?.source_group ?? "",
  };
  documents = [doc, ...documents];
  return doc;
}

export async function update(id: string, name: string, meta?: DocumentMeta): Promise<DocumentInfo> {
  await delay(600);
  let updated: DocumentInfo | undefined;
  documents = documents.map((d) => {
    if (d.id !== id) return d;
    updated = {
      ...d,
      display_name: name,
      filename: name,
      created_at: d.created_at ?? d.uploaded_at,
      uploaded_at: nowIso(),
      category: meta?.category ?? d.category,
      domain: meta?.domain ?? d.domain,
      topics: meta?.topics ?? d.topics,
      summary: meta?.summary ?? d.summary,
      related: meta?.related ?? d.related,
      source_group: meta?.source_group ?? d.source_group,
    };
    return updated;
  });
  return updated ?? create(name, meta);
}

export async function remove(id: string): Promise<void> {
  await delay(300);
  documents = documents.filter((d) => d.id !== id);
}

export async function scanOrphans(
  sourceGroup: string,
  keepFilenames: string[],
): Promise<DocumentInfo[]> {
  await delay(200);
  const group = (sourceGroup || "").trim();
  if (!group) return [];
  const keep = new Set(keepFilenames.filter(Boolean));
  return documents.filter(
    (d) => (d.source_group || "").trim() === group && !keep.has(d.filename),
  );
}

/* --------------------------- Upload Pintar (auto-split) --------------------------- */

export async function autoSplit(text: string, filename = "", level = 2): Promise<AutoSplitResult> {
  await delay(500);
  const boundary = level === 3 ? /^(?=###\s)/m : /^(?=##\s)/m;
  const headRe = level === 3 ? /^###\s+(.*)/ : /^##\s+(.*)/;
  const parts = text
    .split(boundary)
    .map((p) => p.trim())
    .filter(Boolean);
  const src = parts.length ? parts : [text.trim()].filter(Boolean);
  const sections = src.map((body, i) => {
    const m = body.match(headRe);
    const title = (m ? m[1] : `Bagian ${i + 1}`).trim();
    const slug =
      title
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-")
        .slice(0, 60) || `bagian-${i + 1}`;
    return {
      title,
      filename: `${slug}.md`,
      category: "FAQ",
      domain: "Tentang Sistem",
      topics: ["mock"],
      summary: "Ringkasan contoh (mode mock).",
      content: body,
      char_count: body.length,
    };
  });
  return { source_name: filename, count: sections.length, sections };
}

export async function resetKb(): Promise<{ deleted: number }> {
  await delay(400);
  const n = documents.length;
  documents = [];
  return { deleted: n };
}

/* ------------------------------ Template ------------------------------ */

let templates: TemplateInfo[] = [
  {
    id: "t1",
    text: "Apa urutan prioritas status siswa?",
    created_at: nowIso(),
  },
  {
    id: "t2",
    text: "Bagaimana cara Set to Paid invoice di menu Accounting?",
    created_at: nowIso(),
  },
  {
    id: "t3",
    text: "Siapa saja yang boleh mengisi Meeting Journal?",
    created_at: nowIso(),
  },
];

export async function templateList(): Promise<TemplateInfo[]> {
  await delay(200);
  return [...templates];
}

export async function templateCreate(text: string): Promise<TemplateInfo> {
  await delay(300);
  const t: TemplateInfo = {
    id: crypto.randomUUID(),
    text,
    created_at: nowIso(),
  };
  templates = [...templates, t];
  return t;
}

export async function templateUpdate(id: string, text: string): Promise<TemplateInfo> {
  await delay(300);
  let updated: TemplateInfo | undefined;
  templates = templates.map((t) => {
    if (t.id !== id) return t;
    updated = { ...t, text };
    return updated;
  });
  return updated ?? templateCreate(text);
}

export async function templateRemove(id: string): Promise<void> {
  await delay(200);
  templates = templates.filter((t) => t.id !== id);
}

/* --------------------------- Pertanyaan populer --------------------------- */

const popularStore: Record<string, number> = {
  "Apa urutan prioritas status siswa?": 5,
  "Bagaimana cara Set to Paid invoice di menu Accounting?": 3,
  "Siapa saja yang boleh mengisi Meeting Journal?": 2,
};

function bumpPopular(q: string) {
  const key = q.trim();
  if (!key) return;
  popularStore[key] = (popularStore[key] ?? 0) + 1;
}

export async function popular(limit: number): Promise<PopularQuestion[]> {
  await delay(200);
  return Object.entries(popularStore)
    .map(([question, count]) => ({ question, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/* ------------------------------ Settings ------------------------------ */

const DEFAULT_PROMPT =
  "Kamu asisten FAQ internal Timedoor Academy untuk tim CS/Admin. " +
  "Jawab HANYA berdasarkan dokumen di knowledge base.";

const DEFAULT_MODEL = "gemini-3.5-flash";
const DEFAULT_CLASSIFY_MODEL = "gemini-3.5-flash-lite";

let settings: SettingsInfo = {
  system_prompt: DEFAULT_PROMPT,
  default_system_prompt: DEFAULT_PROMPT,
  is_custom: false,
  model: DEFAULT_MODEL,
  default_model: DEFAULT_MODEL,
  classify_model: DEFAULT_CLASSIFY_MODEL,
  default_classify_model: DEFAULT_CLASSIFY_MODEL,
};

export async function listModels() {
  await delay(200);
  return [
    { name: "gemini-3.5-flash", display_name: "Gemini 3.5 Flash", warn: false },
    {
      name: "gemini-3.5-flash-lite",
      display_name: "Gemini 3.5 Flash Lite",
      warn: false,
    },
    { name: "gemini-3-pro-preview", display_name: "Gemini 3 Pro", warn: false },
    { name: "gemini-2.5-flash", display_name: "Gemini 2.5 Flash", warn: true },
  ];
}

export async function getSettings(): Promise<SettingsInfo> {
  await delay(200);
  return { ...settings };
}

export async function updateSettings(patch: {
  system_prompt?: string;
  model?: string;
  classify_model?: string;
}): Promise<SettingsInfo> {
  await delay(300);
  const next = { ...settings };

  if (patch.system_prompt !== undefined) {
    const cleaned = patch.system_prompt.trim();
    next.system_prompt = cleaned || next.default_system_prompt;
    next.is_custom = Boolean(cleaned);
  }
  if (patch.model !== undefined) {
    next.model = patch.model.trim() || next.default_model;
  }
  if (patch.classify_model !== undefined) {
    next.classify_model = patch.classify_model.trim() || next.default_classify_model;
  }

  settings = next;
  return { ...settings };
}

/* --------------------------- Uji Pencarian (mock) --------------------------- */

export async function debugSearch(
  question: string,
  domain?: string,
  topic?: string,
  topK = 5,
): Promise<SearchDebugResult> {
  await delay(500);
  const k = topK && topK > 0 ? Math.min(topK, 50) : 5;
  const sources = [
    { source: "SOP_CMS_Admin.md", domain: "CMS Admin", category: "SOP", topics: ["invoice", "status siswa"] },
    { source: "RULES_System_Rules.md", domain: "System Rules", category: "RULES", topics: ["prioritas status"] },
    { source: "FAQ_Teacher_Journal.md", domain: "Teacher", category: "FAQ", topics: ["meeting journal"] },
    { source: "GLOSSARY_Tentang_Sistem.md", domain: "Tentang Sistem", category: "GLOSSARY", topics: ["glosarium"] },
    { source: "SOP_Akun_Akses.md", domain: "Akun & Akses", category: "SOP", topics: ["login", "reset password"] },
  ];
  const results = Array.from({ length: k }, (_, i) => {
    const s = sources[i % sources.length];
    const score = Math.max(0.12, 0.92 - i * 0.11);
    const text =
      `[MOCK] Cuplikan chunk #${i + 1} dari ${s.source} untuk pertanyaan "${question}". ` +
      "Ini teks contoh untuk menguji visualisasi skor & daftar chunk tanpa backend. " +
      "Set VITE_USE_MOCK=false untuk memakai retrieval asli dari PostgreSQL/pgvector.";
    return {
      rank: i + 1,
      score: Number(score.toFixed(4)),
      id: `${s.source}::${i}`,
      doc_id: s.source,
      source: s.source,
      doc_name: s.source,
      chunk_index: i,
      domain: s.domain,
      category: s.category,
      topics: s.topics,
      approx_tokens: 180 - i * 12,
      char_count: text.length,
      text,
    };
  });
  return {
    query: question,
    search_query: question,
    rewritten: false,
    top_k: k,
    candidates: Math.max(k, 25),
    returned: results.length,
    filters: {
      domain: domain ?? "",
      topic: topic ?? "",
      domain_applied: Boolean(domain),
      domain_fallback: false,
      topic_applied: Boolean(topic),
      topic_fallback: false,
    },
    results,
  };
}
