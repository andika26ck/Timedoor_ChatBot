import { useEffect, useMemo, useRef, useState } from "react";
import {
  CATEGORIES,
  DOMAINS,
  createDocumentFile,
  createDocumentText,
  deleteDocument,
  getDocumentContent,
  getTaxonomy,
  listDocuments,
  resetKnowledgeBase,
  predictFilename,
  suggestMetadata,
  updateDocumentFile,
  updateDocumentText,
  type DocumentContent,
  type DocumentInfo,
  type DocumentMeta,
} from "../lib/api";
import { SmartUpload } from "./SmartUpload";

type Mode = "file" | "text" | "smart";

type SortKey = "updated_desc" | "updated_asc" | "created_desc" | "created_asc";

const UNGROUPED = "Tanpa domain";

/**
 * Kelas input dipakai bersama supaya field di light & dark selalu konsisten.
 * Dark: surface night-800 + teks Ash, bukan putih polos.
 */
const FIELD =
  "mt-1 w-full rounded-lg border px-3 py-2 text-sm transition " +
  "border-slate-200 bg-white text-jet-700 placeholder:text-slate-400 " +
  "focus:border-brand-400 focus:outline-none " +
  "dark:border-night-600 dark:bg-night-800 dark:text-jet-100 " +
  "dark:placeholder:text-brand-200/40 dark:focus:border-brand-500";

const LABEL = "block text-sm font-medium text-jet-700 dark:text-brand-100";

const CARD =
  "rounded-2xl border border-slate-200 bg-white " + "dark:border-night-700 dark:bg-night-900";

const GHOST_BTN =
  "rounded-lg border px-2.5 py-1 text-xs transition " +
  "border-slate-200 text-jet-700 hover:bg-jet-100 " +
  "dark:border-night-600 dark:text-brand-100 dark:hover:bg-night-800";

/** Format ISO-8601 -> "18 Agu 2026, 14.30" (locale id-ID, zona waktu lokal). */
function fmtDate(iso?: string): string {
  if (!iso) return "\u2014";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "\u2014";
  return d.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

function badgeClass(kind: "category" | "domain" | "topic" | "source"): string {
  if (kind === "category")
    return (
      "bg-brand-50 text-brand-700 border-brand-200 " +
      "dark:bg-brand-900/40 dark:text-brand-200 dark:border-brand-700"
    );
  if (kind === "domain")
    return (
      "bg-ocean-50 text-navy border-ocean-100 " +
      "dark:bg-navy-600/25 dark:text-ocean dark:border-navy-600"
    );
  if (kind === "source")
    return (
      "bg-amber-50 text-amber-700 border-amber-200 " +
      "dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-700"
    );
  return (
    "bg-jet-100 text-jet-700 border-slate-200 " +
    "dark:bg-night-800 dark:text-brand-100/80 dark:border-night-600"
  );
}

function Badge({
  kind,
  children,
}: {
  kind: "category" | "domain" | "topic" | "source";
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${badgeClass(
        kind,
      )}`}
    >
      {children}
    </span>
  );
}

/** Modal untuk melihat isi dokumen (fitur Detail). */
function DetailModal({
  data,
  loading,
  createdAt,
  updatedAt,
  onClose,
}: {
  data: DocumentContent | null;
  loading: boolean;
  createdAt?: string;
  updatedAt?: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-jet-900/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-xl dark:bg-night-900 dark:ring-1 dark:ring-night-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-night-700">
          <h3 className="truncate text-sm font-semibold text-navy dark:text-jet-100">
            {loading ? "Memuat..." : data?.display_name}
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-slate-400 transition hover:bg-jet-100 hover:text-jet-700 dark:text-brand-200/60 dark:hover:bg-night-800 dark:hover:text-brand-100"
          >
            ✕
          </button>
        </div>
        {!loading && (createdAt || updatedAt) && (
          <div className="border-b border-slate-100 px-5 py-2 text-[11px] text-slate-400 dark:border-night-800 dark:text-brand-200/60">
            Diupload {fmtDate(createdAt || updatedAt)}
            {createdAt && updatedAt && updatedAt !== createdAt ? (
              <> · Diperbarui {fmtDate(updatedAt)}</>
            ) : null}
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="text-sm text-slate-500 dark:text-brand-200/70">
              Memuat isi dokumen...
            </div>
          ) : (
            <>
              {data?.truncated && (
                <div className="mb-3 rounded-lg border border-sunglow/50 bg-sunglow-50 px-3 py-2 text-xs text-amber-700 dark:border-sunglow/30 dark:bg-sunglow/10 dark:text-sunglow">
                  Isi dokumen dipotong karena terlalu panjang.
                </div>
              )}
              <pre className="whitespace-pre-wrap break-words font-sans text-sm text-jet-700 dark:text-brand-100">
                {data?.content}
              </pre>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** Buang blok header metadata (--- ... ---) yang diselipkan sistem di atas isi. */
function stripMetaHeader(content: string): string {
  const m = content.match(/^---\n[\s\S]*?\n---\n\n?/);
  return m ? content.slice(m[0].length) : content;
}

/** Modal edit teks in-place untuk satu dokumen (.md/.txt). */
function EditModal({
  doc,
  categories,
  domainOptions,
  onClose,
  onSaved,
  onError,
}: {
  doc: DocumentInfo;
  categories: string[];
  domainOptions: string[];
  onClose: () => void;
  onSaved: () => void;
  onError: (msg: string) => void;
}) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [category, setCategory] = useState(doc.category || "");
  const [domain, setDomain] = useState(doc.domain || "");
  const [topics, setTopics] = useState((doc.topics || []).join(", "));
  const [summary, setSummary] = useState(doc.summary || "");
  const [related, setRelated] = useState((doc.related || []).join(", "));

  useEffect(() => {
    let alive = true;
    getDocumentContent(doc.id)
      .then((c) => {
        if (alive) setContent(stripMetaHeader(c.content));
      })
      .catch((e) => onError(e instanceof Error ? e.message : "Gagal memuat isi dokumen."))
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.id]);

  async function save() {
    if (!content.trim()) {
      onError("Isi teks tidak boleh kosong.");
      return;
    }
    setSaving(true);
    try {
      await updateDocumentText(doc.id, doc.filename, content, {
        category,
        domain,
        topics: topics
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        summary,
        related: related
          .split(",")
          .map((r) => r.trim())
          .filter(Boolean),
      });
      onSaved();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Gagal menyimpan perubahan.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-jet-900/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-xl dark:bg-night-900 dark:ring-1 dark:ring-night-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-night-700">
          <h3 className="truncate text-sm font-semibold text-navy dark:text-jet-100">
            Edit teks — {doc.display_name}
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-slate-400 transition hover:bg-jet-100 hover:text-jet-700 dark:text-brand-200/60 dark:hover:bg-night-800 dark:hover:text-brand-100"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="text-sm text-slate-500 dark:text-brand-200/70">
              Memuat isi dokumen...
            </div>
          ) : (
            <>
              <label className={LABEL}>Isi teks</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={12}
                className={FIELD}
              />
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className={LABEL}>Kategori</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className={FIELD}
                  >
                    <option value="">(tanpa prefix)</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}_
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={LABEL}>Domain</label>
                  <select
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    className={FIELD}
                  >
                    <option value="">(belum ditentukan)</option>
                    {domainOptions.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-3">
                <label className={LABEL}>Label topik (pisahkan dengan koma)</label>
                <input
                  value={topics}
                  onChange={(e) => setTopics(e.target.value)}
                  className={FIELD}
                />
              </div>
              <div className="mt-3">
                <label className={LABEL}>Ringkasan singkat</label>
                <textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  rows={2}
                  className={FIELD}
                />
              </div>
              <div className="mt-3">
                <label className={LABEL}>Dokumen terkait (pisahkan dengan koma)</label>
                <input
                  value={related}
                  onChange={(e) => setRelated(e.target.value)}
                  className={FIELD}
                />
              </div>
            </>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3 dark:border-night-700">
          <button onClick={onClose} className={GHOST_BTN}>
            Batal
          </button>
          <button
            onClick={save}
            disabled={saving || loading}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-50 dark:hover:bg-brand-500"
          >
            {saving ? "Menyimpan..." : "Simpan perubahan"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function DocumentsPanel() {
  const [docs, setDocs] = useState<DocumentInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  // form
  const [mode, setMode] = useState<Mode>("file");
  const [file, setFile] = useState<File | null>(null);
  const [filename, setFilename] = useState("");
  const [textContent, setTextContent] = useState("");
  const [category, setCategory] = useState("");
  const [domain, setDomain] = useState("");
  const [topics, setTopics] = useState("");
  const [summary, setSummary] = useState("");
  const [related, setRelated] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [suggesting, setSuggesting] = useState(false);

  // taksonomi (fallback ke konstanta)
  const [categories, setCategories] = useState<string[]>(CATEGORIES);
  const [domainOptions, setDomainOptions] = useState<string[]>(DOMAINS);

  // detail modal
  const [detail, setDetail] = useState<DocumentContent | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailDoc, setDetailDoc] = useState<DocumentInfo | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>("updated_desc");

  // edit teks in-place
  const [editing, setEditing] = useState<DocumentInfo | null>(null);

  // update file (ganti file dokumen yang sudah ada)
  const updateInputRef = useRef<HTMLInputElement>(null);
  const updateTargetRef = useRef<DocumentInfo | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      setDocs(await listDocuments());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat dokumen.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    getTaxonomy()
      .then((t) => {
        if (t.categories.length) setCategories(t.categories);
        if (t.domains.length) setDomainOptions(t.domains);
      })
      .catch(() => {
        /* pakai konstanta bawaan */
      });
  }, []);

  function resetForm() {
    setFile(null);
    setFilename("");
    setTextContent("");
    setCategory("");
    setDomain("");
    setTopics("");
    setSummary("");
    setRelated("");
  }

  function currentMeta(): DocumentMeta {
    return {
      category,
      domain,
      topics: topics
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      summary,
      related: related
        .split(",")
        .map((r) => r.trim())
        .filter(Boolean),
    };
  }

  async function handleSuggest() {
    const source = mode === "text" ? textContent.trim() : "";
    if (!source) {
      setError("Saran AI hanya tersedia untuk mode Teks. Tempel isi dokumennya dulu.");
      return;
    }
    setSuggesting(true);
    setError(null);
    try {
      const s = await suggestMetadata(source);
      if (s.category) setCategory(s.category);
      if (s.domain) setDomain(s.domain);
      if (s.topics.length) setTopics(s.topics.join(", "));
      if (s.summary) setSummary(s.summary);
      setNotice("Saran AI terisi. Silakan cek & sesuaikan sebelum simpan.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal meminta saran AI.");
    } finally {
      setSuggesting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    const meta = currentMeta();
    setSubmitting(true);
    try {
      if (mode === "file") {
        if (!file) {
          setError("Pilih file dulu.");
          setSubmitting(false);
          return;
        }
        await createDocumentFile(file, meta);
      } else {
        if (!filename.trim() || !textContent.trim()) {
          setError("Nama file dan isi teks wajib diisi.");
          setSubmitting(false);
          return;
        }
        const predicted = predictFilename(filename.trim(), category);
        let onConflict: "overwrite" | "new" = "overwrite";
        if (docs.some((d) => d.filename === predicted)) {
          onConflict = confirm(
            `Nama file "${predicted}" sudah ada.\n\nOK = Timpa dokumen lama.\nBatal = Simpan sebagai dokumen baru.`,
          )
            ? "overwrite"
            : "new";
        }
        await createDocumentText(filename.trim(), textContent.trim(), meta, onConflict);
      }
      resetForm();
      setNotice("Dokumen berhasil ditambahkan & diindeks.");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menambah dokumen.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResetKb() {
    if (!confirm("Kosongkan SELURUH knowledge base? Semua dokumen & indeks akan dihapus permanen."))
      return;
    if (!confirm("Yakin? Tindakan ini tidak bisa dibatalkan.")) return;
    setResetting(true);
    setError(null);
    setNotice(null);
    try {
      const { deleted } = await resetKnowledgeBase();
      setNotice(`Knowledge base dikosongkan (${deleted} dokumen dihapus).`);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengosongkan knowledge base.");
    } finally {
      setResetting(false);
    }
  }

  async function handleDelete(doc: DocumentInfo) {
    if (!confirm(`Hapus "${doc.display_name}"?`)) return;
    setError(null);
    try {
      await deleteDocument(doc.id);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menghapus dokumen.");
    }
  }

  async function openDetail(doc: DocumentInfo) {
    setDetailOpen(true);
    setDetailDoc(doc);
    setDetailLoading(true);
    setDetail(null);
    try {
      setDetail(await getDocumentContent(doc.id));
    } catch (e) {
      setDetail({
        id: doc.id,
        display_name: doc.display_name,
        filename: doc.filename,
        content: e instanceof Error ? e.message : "Gagal memuat isi dokumen.",
        truncated: false,
      });
    } finally {
      setDetailLoading(false);
    }
  }

  function startUpdate(doc: DocumentInfo) {
    updateTargetRef.current = doc;
    updateInputRef.current?.click();
  }

  async function onUpdateFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    e.target.value = "";
    const target = updateTargetRef.current;
    if (!picked || !target) return;
    setError(null);
    try {
      // bawa metadata lama supaya tidak hilang saat ganti file
      await updateDocumentFile(target.id, picked, {
        category: target.category,
        domain: target.domain,
        topics: target.topics,
        summary: target.summary,
        related: target.related,
      });
      setNotice(`"${target.display_name}" berhasil diperbarui.`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memperbarui.");
    } finally {
      updateTargetRef.current = null;
    }
  }

  // Level 3: kelompokkan dokumen per domain untuk ditampilkan.
  const grouped = useMemo(() => {
    const keyOf = (d: DocumentInfo) =>
      (sortBy.startsWith("created") ? d.created_at || d.uploaded_at : d.uploaded_at) || "";
    const dir = sortBy.endsWith("asc") ? 1 : -1;
    const sortedDocs = [...docs].sort((a, b) => {
      const av = keyOf(a);
      const bv = keyOf(b);
      return av < bv ? -dir : av > bv ? dir : 0;
    });
    const map = new Map<string, DocumentInfo[]>();
    for (const d of sortedDocs) {
      const key = d.domain?.trim() || UNGROUPED;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(d);
    }
    const order = [...domainOptions, UNGROUPED];
    return [...map.entries()].sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
  }, [docs, domainOptions, sortBy]);

  return (
    <div className="h-full overflow-y-auto bg-jet-100 dark:bg-night-950">
      <div className="mx-auto max-w-4xl px-4 py-6">
        <h2 className="text-lg font-semibold text-navy dark:text-jet-100">Dokumen</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-brand-200/70">
          Tambah dokumen ke knowledge base. Beri kategori (untuk konvensi nama file), domain, dan
          label topik supaya bot lebih akurat memilih sumber.
        </p>

        {/* Form tambah */}
        <div className="mt-4">
          <div className="mb-3 inline-flex rounded-lg border border-slate-200 p-0.5 text-sm dark:border-night-600 dark:bg-night-800/60">
            <button
              type="button"
              onClick={() => setMode("file")}
              className={`rounded-md px-3 py-1.5 transition ${
                mode === "file"
                  ? "bg-brand-600 text-white"
                  : "text-jet-700 hover:bg-jet-100 dark:text-brand-100 dark:hover:bg-night-700"
              }`}
            >
              Upload file
            </button>
            <button
              type="button"
              onClick={() => setMode("text")}
              className={`rounded-md px-3 py-1.5 transition ${
                mode === "text"
                  ? "bg-brand-600 text-white"
                  : "text-jet-700 hover:bg-jet-100 dark:text-brand-100 dark:hover:bg-night-700"
              }`}
            >
              Tempel teks
            </button>
            <button
              type="button"
              onClick={() => setMode("smart")}
              className={`rounded-md px-3 py-1.5 transition ${
                mode === "smart"
                  ? "bg-brand-600 text-white"
                  : "text-jet-700 hover:bg-jet-100 dark:text-brand-100 dark:hover:bg-night-700"
              }`}
            >
              Smart Upload
            </button>
          </div>

          {mode === "smart" ? (
            <SmartUpload
              categories={categories}
              domainOptions={domainOptions}
              onCommitted={(n) => {
                setNotice(`${n} dokumen berhasil dibuat dari 1 file.`);
                refresh();
              }}
              onRefresh={refresh}
              onError={(m) => setError(m)}
            />
          ) : (
            <form onSubmit={handleSubmit} className={`p-4 ${CARD}`}>
              {mode === "file" ? (
                <div>
                  <label className={LABEL}>File (PDF / DOCX / MD / TXT)</label>
                  <input
                    type="file"
                    accept=".pdf,.docx,.md,.txt"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    className={
                      "mt-1 block w-full cursor-pointer rounded-lg border px-3 py-2 text-sm transition " +
                      "border-slate-200 bg-white text-jet-700 " +
                      "file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-brand-700 hover:file:bg-brand-100 " +
                      "dark:border-night-600 dark:bg-night-800 dark:text-brand-100 " +
                      "dark:file:bg-brand-900/50 dark:file:text-brand-200 dark:hover:file:bg-brand-800"
                    }
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className={LABEL}>Nama file</label>
                    <input
                      value={filename}
                      onChange={(e) => setFilename(e.target.value)}
                      placeholder="mis. Panduan_Onboarding"
                      className={FIELD}
                    />
                  </div>
                  <div>
                    <label className={LABEL}>Isi teks</label>
                    <textarea
                      value={textContent}
                      onChange={(e) => setTextContent(e.target.value)}
                      rows={5}
                      placeholder="Tempel isi dokumen di sini..."
                      className={FIELD}
                    />
                  </div>
                </div>
              )}

              {/* Metadata akurasi */}
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className={LABEL}>Kategori (prefix nama file)</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className={FIELD}
                  >
                    <option value="">(tanpa prefix)</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}_
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={LABEL}>Domain</label>
                  <select
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    className={FIELD}
                  >
                    <option value="">(belum ditentukan)</option>
                    {domainOptions.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-3">
                <div className="flex items-center justify-between">
                  <label className={LABEL}>Label topik (pisahkan dengan koma)</label>
                  {mode === "text" && (
                    <button
                      type="button"
                      onClick={handleSuggest}
                      disabled={suggesting || !textContent.trim()}
                      className={
                        "rounded-lg border px-2.5 py-1 text-xs font-medium transition disabled:opacity-50 " +
                        "border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100 " +
                        "dark:border-brand-700 dark:bg-brand-900/40 dark:text-brand-200 dark:hover:bg-brand-800/60"
                      }
                    >
                      {suggesting ? "Menganalisis..." : "✨ Sarankan (AI)"}
                    </button>
                  )}
                </div>
                <input
                  value={topics}
                  onChange={(e) => setTopics(e.target.value)}
                  placeholder="mis. cuti, remote, benefits"
                  className={FIELD}
                />
              </div>

              {mode === "text" && (
                <div className="mt-3 space-y-3">
                  <div>
                    <label className={LABEL}>Ringkasan singkat (Level 2, opsional)</label>
                    <textarea
                      value={summary}
                      onChange={(e) => setSummary(e.target.value)}
                      rows={2}
                      placeholder="Ringkasan 1-2 kalimat tentang isi dokumen ini."
                      className={FIELD}
                    />
                  </div>
                  <div>
                    <label className={LABEL}>Dokumen terkait (Level 2, pisahkan dengan koma)</label>
                    <input
                      value={related}
                      onChange={(e) => setRelated(e.target.value)}
                      placeholder="mis. SOP_Cuti_Tahunan, RULES_Remote"
                      className={FIELD}
                    />
                  </div>
                </div>
              )}

              <div className="mt-4 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-50 dark:hover:bg-brand-500"
                >
                  {submitting ? "Menyimpan..." : "Tambah dokumen"}
                </button>
                {category && (
                  <span className="text-xs text-slate-400 dark:text-brand-200/60">
                    Nama file akan diawali <b>{category}_</b>
                  </span>
                )}
              </div>
            </form>
          )}
        </div>

        {notice && (
          <div className="mt-3 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-700 dark:border-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
            {notice}
          </div>
        )}
        {error && (
          <div className="mt-3 rounded-lg border border-sunglow/50 bg-sunglow-50 px-3 py-2 text-sm text-amber-800 dark:border-sunglow/30 dark:bg-sunglow/10 dark:text-sunglow">
            ⚠️ {error}
          </div>
        )}

        {/* Daftar dokumen dikelompokkan per domain */}
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-navy dark:text-jet-100">
              Daftar dokumen ({docs.length})
            </h3>
            <div className="flex items-center gap-3">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortKey)}
                title="Urutkan dokumen"
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-jet-700 dark:border-night-600 dark:bg-night-800 dark:text-brand-100"
              >
                <option value="updated_desc">Terbaru diperbarui</option>
                <option value="updated_asc">Terlama diperbarui</option>
                <option value="created_desc">Terbaru diupload</option>
                <option value="created_asc">Terlama diupload</option>
              </select>
              <button
                onClick={refresh}
                className="text-xs text-brand-700 transition hover:underline dark:text-brand-300"
              >
                Muat ulang
              </button>
              <button
                onClick={handleResetKb}
                disabled={resetting || docs.length === 0}
                className="text-xs text-blush transition hover:underline disabled:opacity-40 dark:text-blush-400"
              >
                {resetting ? "Mengosongkan..." : "Reset KB"}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="mt-3 text-sm text-slate-500 dark:text-brand-200/70">Memuat...</div>
          ) : docs.length === 0 ? (
            <div className="mt-3 rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400 dark:border-night-600 dark:text-brand-200/60">
              Belum ada dokumen. Tambahkan lewat form di atas.
            </div>
          ) : (
            <div className="mt-3 space-y-5">
              {grouped.map(([groupName, groupDocs]) => (
                <div key={groupName}>
                  <div className="mb-2 flex items-center gap-2">
                    <Badge kind="domain">{groupName}</Badge>
                    <span className="text-xs text-slate-400 dark:text-brand-200/60">
                      {groupDocs.length} dokumen
                    </span>
                  </div>
                  <div className="space-y-2">
                    {groupDocs.map((doc) => (
                      <div key={doc.id} className={`p-3 ${CARD}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-jet-700 dark:text-jet-100">
                              {doc.display_name}
                            </div>
                            <div className="mt-1 flex flex-wrap gap-1.5">
                              {doc.category && <Badge kind="category">{doc.category}</Badge>}
                              {doc.topics.map((t) => (
                                <Badge key={t} kind="topic">
                                  #{t}
                                </Badge>
                              ))}
                              {doc.source_group && (
                                <Badge kind="source">📄 {doc.source_group}</Badge>
                              )}
                            </div>
                            {doc.summary && (
                              <p className="mt-1.5 line-clamp-2 text-xs text-slate-500 dark:text-brand-200/70">
                                {doc.summary}
                              </p>
                            )}
                            {doc.related.length > 0 && (
                              <p className="mt-1 text-xs text-slate-400 dark:text-brand-200/50">
                                Terkait: {doc.related.join(", ")}
                              </p>
                            )}
                            <p className="mt-1.5 text-[11px] text-slate-400 dark:text-brand-200/50">
                              Diupload {fmtDate(doc.created_at || doc.uploaded_at)}
                              {doc.created_at && doc.uploaded_at !== doc.created_at ? (
                                <> · Diperbarui {fmtDate(doc.uploaded_at)}</>
                              ) : null}
                            </p>
                          </div>
                          <div className="flex shrink-0 gap-1.5">
                            <button onClick={() => openDetail(doc)} className={GHOST_BTN}>
                              Detail
                            </button>
                            {/\.(md|txt)$/i.test(doc.filename) && (
                              <button onClick={() => setEditing(doc)} className={GHOST_BTN}>
                                Edit teks
                              </button>
                            )}
                            <button onClick={() => startUpdate(doc)} className={GHOST_BTN}>
                              Ganti file
                            </button>
                            <button
                              onClick={() => handleDelete(doc)}
                              className={
                                "rounded-lg border px-2.5 py-1 text-xs transition " +
                                "border-blush/40 text-blush hover:bg-blush-50 " +
                                "dark:border-blush/30 dark:text-blush-400 dark:hover:bg-blush/10"
                              }
                            >
                              Hapus
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* input tersembunyi untuk ganti file */}
        <input
          ref={updateInputRef}
          type="file"
          accept=".pdf,.docx,.md,.txt"
          className="hidden"
          onChange={onUpdateFileChosen}
        />

        {detailOpen && (
          <DetailModal
            data={detail}
            loading={detailLoading}
            createdAt={detailDoc?.created_at || detailDoc?.uploaded_at}
            updatedAt={detailDoc?.uploaded_at}
            onClose={() => setDetailOpen(false)}
          />
        )}

        {editing && (
          <EditModal
            doc={editing}
            categories={categories}
            domainOptions={domainOptions}
            onClose={() => setEditing(null)}
            onSaved={() => {
              const name = editing.display_name;
              setEditing(null);
              setNotice(`"${name}" berhasil diperbarui.`);
              refresh();
            }}
            onError={(m) => setError(m)}
          />
        )}
      </div>
    </div>
  );
}
