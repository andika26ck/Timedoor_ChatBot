import { useState } from "react";
import {
  autoSplitFile,
  autoSplitText,
  createDocumentText,
  listDocuments,
  predictFilename,
  type SplitSection,
} from "../lib/api";

type InputMode = "file" | "text";

interface EditableSection extends SplitSection {
  include: boolean;
  open: boolean;
  conflict: "overwrite" | "new";
}

const FIELD =
  "mt-1 w-full rounded-lg border px-3 py-2 text-sm transition " +
  "border-slate-200 bg-white text-jet-700 placeholder:text-slate-400 " +
  "focus:border-brand-400 focus:outline-none " +
  "dark:border-night-600 dark:bg-night-800 dark:text-jet-100 " +
  "dark:placeholder:text-brand-200/40 dark:focus:border-brand-500";
const LABEL = "block text-xs font-medium text-jet-700 dark:text-brand-100";
const CARD = "rounded-2xl border border-slate-200 bg-white dark:border-night-700 dark:bg-night-900";

/**
 * Upload Pintar: unggah 1 dokumen besar, pecah otomatis per heading H2 (##),
 * beri saran metadata, tinjau/edit, lalu simpan tiap bagian sebagai dokumen.
 */
export function SmartUpload({
  categories,
  domainOptions,
  onCommitted,
  onError,
}: {
  categories: string[];
  domainOptions: string[];
  onCommitted: (count: number) => void;
  onError: (msg: string) => void;
}) {
  const [input, setInput] = useState<InputMode>("file");
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [useAi, setUseAi] = useState(true);
  const [level, setLevel] = useState<2 | 3>(2);
  const [analyzing, setAnalyzing] = useState(false);
  const [sections, setSections] = useState<EditableSection[] | null>(null);
  const [committing, setCommitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [localErr, setLocalErr] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [existingNames, setExistingNames] = useState<Set<string>>(new Set());

  function fail(msg: string) {
    setLocalErr(msg);
    onError(msg);
  }

  async function handleAnalyze() {
    setLocalErr(null);
    setAnalyzing(true);
    try {
      const res =
        input === "file"
          ? file
            ? await autoSplitFile(file, useAi, level)
            : null
          : text.trim()
            ? await autoSplitText(text.trim(), "", useAi, level)
            : null;
      if (!res) {
        fail(input === "file" ? "Pilih file dulu." : "Tempel teks dokumen dulu.");
        return;
      }
      if (!res.sections.length) {
        fail("Tidak ada bagian yang bisa dibuat. Pastikan dokumen punya heading H2 (##).");
        return;
      }
      try {
        const docs = await listDocuments();
        setExistingNames(new Set(docs.map((d) => d.filename)));
      } catch {
        /* abaikan; peringatan duplikat bersifat opsional */
      }
      setSections(
        res.sections.map((s) => ({
          ...s,
          include: true,
          open: false,
          conflict: "overwrite" as const,
        })),
      );
    } catch (e) {
      fail(e instanceof Error ? e.message : "Gagal menganalisis dokumen.");
    } finally {
      setAnalyzing(false);
    }
  }

  function patch(i: number, change: Partial<EditableSection>) {
    setSections((prev) =>
      prev ? prev.map((s, idx) => (idx === i ? { ...s, ...change } : s)) : prev,
    );
  }

  async function handleCommit() {
    if (!sections) return;
    const chosen = sections.filter((s) => s.include);
    if (!chosen.length) {
      fail("Pilih minimal satu bagian untuk disimpan.");
      return;
    }
    setCommitting(true);
    setLocalErr(null);
    setProgress(0);
    let done = 0;
    try {
      for (const s of chosen) {
        const name = s.filename.trim() || "bagian.md";
        await createDocumentText(
          name,
          s.content,
          {
            category: s.category,
            domain: s.domain,
            topics: s.topics,
            summary: s.summary,
            related: [],
          },
          s.conflict,
        );
        done += 1;
        setProgress(done);
      }
      setSections(null);
      setFile(null);
      setText("");
      onCommitted(done);
    } catch (e) {
      fail(
        (e instanceof Error ? e.message : "Gagal menyimpan dokumen.") +
          ` (berhasil ${done}/${chosen.length})`,
      );
    } finally {
      setCommitting(false);
    }
  }

  const chosenCount = sections?.filter((s) => s.include).length ?? 0;

  return (
    <div className={`p-4 ${CARD}`}>
      <p className="text-sm text-slate-500 dark:text-brand-200/70">
        Unggah 1 dokumen besar (mis. guideline lengkap). Sistem memecahnya per heading (pilih{" "}
        <b>H2</b> atau <b>H3</b> di bawah) menjadi beberapa dokumen terpisah, lalu memberi saran
        kategori/domain/topik otomatis. Tinjau dulu sebelum disimpan.
      </p>

      <button
        type="button"
        onClick={() => setShowHelp((v) => !v)}
        className="mt-2 text-xs font-medium text-brand-700 transition hover:underline dark:text-brand-300"
      >
        {showHelp ? "Sembunyikan format file" : "📄 Lihat format file yang didukung"}
      </button>
      {showHelp && (
        <div className="mt-2 rounded-xl border border-slate-200 bg-jet-50 p-3 text-xs text-jet-700 dark:border-night-700 dark:bg-night-800/60 dark:text-brand-100">
          <p className="font-semibold text-navy dark:text-jet-100">
            Format file untuk Upload Pintar
          </p>
          <ol className="mt-1 list-decimal space-y-1 pl-4">
            <li>
              Pisahkan tiap topik dengan judul <b>H2</b> (<code>## Judul Topik</code>). Satu H2 =
              satu dokumen.
            </li>
            <li>
              Disarankan: tepat di bawah judul, tulis baris metadata ini agar domain/kategori{" "}
              <b>tidak perlu ditebak AI</b>:
              <pre className="mt-1 overflow-x-auto rounded-lg bg-white p-2 text-[11px] dark:bg-night-900">
                {"_Domain: CMS Admin · Kategori: SOP · Topik: inquiry, registrasi_"}
              </pre>
            </li>
            <li>
              Untuk sub-bagian di dalam satu topik, gunakan <code>###</code> atau <code>####</code>{" "}
              — <b>jangan</b> <code>##</code> (akan terpecah jadi dokumen baru).
            </li>
            <li>
              Blok <code>---</code> frontmatter di awal file akan diabaikan otomatis (tidak jadi isi
              dokumen).
            </li>
            <li>
              Pilih <b>Pecah per H2</b> (disarankan). H3 hanya untuk dokumen yang sangat panjang.
            </li>
          </ol>
          <div className="mt-2 space-y-1">
            <div>
              <span className="font-medium">Domain valid:</span> {domainOptions.join(", ")}
            </div>
            <div>
              <span className="font-medium">Kategori valid:</span> {categories.join(", ")}
            </div>
          </div>
        </div>
      )}

      {/* Sumber */}
      <div className="mt-3 inline-flex rounded-lg border border-slate-200 p-0.5 text-sm dark:border-night-600 dark:bg-night-800/60">
        {(["file", "text"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setInput(m)}
            className={`rounded-md px-3 py-1.5 transition ${
              input === m
                ? "bg-brand-600 text-white"
                : "text-jet-700 hover:bg-jet-100 dark:text-brand-100 dark:hover:bg-night-700"
            }`}
          >
            {m === "file" ? "Dari file" : "Dari teks"}
          </button>
        ))}
      </div>

      {input === "file" ? (
        <input
          type="file"
          accept=".pdf,.docx,.md,.txt"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className={
            "mt-3 block w-full cursor-pointer rounded-lg border px-3 py-2 text-sm transition " +
            "border-slate-200 bg-white text-jet-700 " +
            "file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-brand-700 hover:file:bg-brand-100 " +
            "dark:border-night-600 dark:bg-night-800 dark:text-brand-100 " +
            "dark:file:bg-brand-900/50 dark:file:text-brand-200 dark:hover:file:bg-brand-800"
          }
        />
      ) : (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          placeholder="Tempel 1 dokumen besar di sini. Tiap sub-topik diawali heading ## ..."
          className={`mt-3 ${FIELD}`}
        />
      )}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-jet-700 dark:text-brand-100">
          <input type="checkbox" checked={useAi} onChange={(e) => setUseAi(e.target.checked)} />
          Sarankan tag otomatis (AI)
        </label>
        <div className="flex items-center gap-2 text-sm text-jet-700 dark:text-brand-100">
          <span>Pecah per:</span>
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 dark:border-night-600 dark:bg-night-800/60">
            {([2, 3] as const).map((lv) => (
              <button
                key={lv}
                type="button"
                onClick={() => setLevel(lv)}
                title={
                  lv === 2
                    ? "Per bab (##) — konteks utuh (disarankan)"
                    : "Per sub-bagian (###) — lebih granular"
                }
                className={`rounded-md px-2.5 py-1 transition ${
                  level === lv
                    ? "bg-brand-600 text-white"
                    : "text-jet-700 hover:bg-jet-100 dark:text-brand-100 dark:hover:bg-night-700"
                }`}
              >
                H{lv}
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={handleAnalyze}
          disabled={analyzing || committing}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-50 dark:hover:bg-brand-500"
        >
          {analyzing ? "Menganalisis..." : "Analisis & Pecah"}
        </button>
      </div>

      {localErr && (
        <div className="mt-3 rounded-lg border border-sunglow/50 bg-sunglow-50 px-3 py-2 text-sm text-amber-800 dark:border-sunglow/30 dark:bg-sunglow/10 dark:text-sunglow">
          ⚠️ {localErr}
        </div>
      )}

      {/* Pratinjau hasil pecahan */}
      {sections && (
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-navy dark:text-jet-100">
              {sections.length} bagian terdeteksi · {chosenCount} dipilih
            </h4>
            <button
              type="button"
              onClick={handleCommit}
              disabled={committing || chosenCount === 0}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-50 dark:hover:bg-brand-500"
            >
              {committing
                ? `Menyimpan ${progress}/${chosenCount}...`
                : `Simpan ${chosenCount} dokumen`}
            </button>
          </div>

          <div className="mt-3 space-y-2">
            {sections.map((s, i) => (
              <div key={i} className={`p-3 ${CARD}`}>
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={s.include}
                    onChange={(e) => patch(i, { include: e.target.checked })}
                    className="mt-1"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate text-sm font-medium text-jet-700 dark:text-jet-100">
                        {s.title || "(tanpa judul)"}
                      </div>
                      <span className="shrink-0 text-xs text-slate-400 dark:text-brand-200/60">
                        {s.char_count.toLocaleString()} karakter
                      </span>
                    </div>

                    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <div>
                        <label className={LABEL}>Nama file</label>
                        <input
                          value={s.filename}
                          onChange={(e) => patch(i, { filename: e.target.value })}
                          className={FIELD}
                        />
                      </div>
                      <div>
                        <label className={LABEL}>Kategori</label>
                        <select
                          value={s.category}
                          onChange={(e) => patch(i, { category: e.target.value })}
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
                          value={s.domain}
                          onChange={(e) => patch(i, { domain: e.target.value })}
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
                      <div>
                        <label className={LABEL}>Topik (pisah koma)</label>
                        <input
                          value={s.topics.join(", ")}
                          onChange={(e) =>
                            patch(i, {
                              topics: e.target.value
                                .split(",")
                                .map((t) => t.trim())
                                .filter(Boolean),
                            })
                          }
                          className={FIELD}
                        />
                      </div>
                    </div>

                    {(() => {
                      const predicted = predictFilename(s.filename, s.category);
                      if (!existingNames.has(predicted)) return null;
                      return (
                        <div className="mt-2 rounded-lg border border-sunglow/50 bg-sunglow-50 px-2.5 py-2 text-[11px] text-amber-800 dark:border-sunglow/30 dark:bg-sunglow/10 dark:text-sunglow">
                          ⚠️ Nama file <b>{predicted}</b> sudah ada di knowledge base.
                          <div className="mt-1 inline-flex rounded-md border border-sunglow/40 p-0.5 align-middle">
                            {(["overwrite", "new"] as const).map((c) => (
                              <button
                                key={c}
                                type="button"
                                onClick={() => patch(i, { conflict: c })}
                                className={`rounded px-2 py-0.5 transition ${
                                  s.conflict === c
                                    ? "bg-brand-600 text-white"
                                    : "text-amber-800 hover:bg-sunglow/20 dark:text-sunglow"
                                }`}
                              >
                                {c === "overwrite" ? "Timpa" : "Buat baru"}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {s.summary && (
                      <p className="mt-2 text-xs text-slate-500 dark:text-brand-200/70">
                        {s.summary}
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={() => patch(i, { open: !s.open })}
                      className="mt-2 text-xs text-brand-700 transition hover:underline dark:text-brand-300"
                    >
                      {s.open ? "Sembunyikan isi" : "Lihat isi"}
                    </button>
                    {s.open && (
                      <pre className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap break-words rounded-lg bg-jet-100 p-2 font-sans text-xs text-jet-700 dark:bg-night-800 dark:text-brand-100">
                        {s.content}
                      </pre>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
