import { useEffect, useState } from "react";
import {
  getSettings,
  listModels,
  resetPopularQuestions,
  updateSettings,
  type ModelOption,
  type SettingsInfo,
} from "../lib/api";

/** Token warna dipakai bersama supaya light & dark konsisten dengan brand. */
const CARD =
  "rounded-2xl border border-slate-200 bg-white " + "dark:border-night-700 dark:bg-night-900";

const FIELD =
  "w-full rounded-xl border px-3 py-2 text-sm transition " +
  "border-slate-200 bg-white text-jet-700 placeholder:text-slate-400 " +
  "focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-600/15 " +
  "disabled:opacity-40 " +
  "dark:border-night-600 dark:bg-night-800 dark:text-jet-100 " +
  "dark:placeholder:text-brand-200/40 dark:focus:border-brand-500 dark:focus:ring-brand-500/20";

const SECONDARY_BTN =
  "rounded-xl border px-4 py-2 text-sm transition disabled:opacity-40 " +
  "border-slate-200 text-jet-700 hover:bg-jet-100 " +
  "dark:border-night-600 dark:text-brand-100 dark:hover:bg-night-800";

const PRIMARY_BTN =
  "rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white transition " +
  "hover:bg-brand-700 disabled:opacity-40 dark:hover:bg-brand-500";

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : "Terjadi kesalahan.";
}

/** Pastikan model yang sedang aktif tetap muncul walau tidak ada di daftar API. */
function withCurrent(list: ModelOption[], ...current: string[]): ModelOption[] {
  const out = [...list];
  for (const name of current) {
    if (name && !out.some((m) => m.name === name)) {
      out.unshift({ name, display_name: name, warn: false });
    }
  }
  return out;
}

function ModelSelect({
  label,
  hint,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  hint: string;
  value: string;
  options: ModelOption[];
  disabled: boolean;
  onChange: (v: string) => void;
}) {
  const picked = options.find((m) => m.name === value);
  return (
    <div>
      <label className="block text-sm font-medium text-jet-700 dark:text-brand-100">{label}</label>
      <p className="mt-0.5 text-xs text-slate-500 dark:text-brand-200/70">{hint}</p>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={`mt-2 ${FIELD}`}
      >
        {options.map((m) => (
          <option key={m.name} value={m.name}>
            {m.display_name === m.name ? m.name : `${m.display_name} - ${m.name}`}
            {m.warn ? "  (berisiko)" : ""}
          </option>
        ))}
      </select>
      {picked?.warn && (
        <p className="mt-1.5 text-xs text-amber-700 dark:text-sunglow">
          Model ini sering ditolak project baru dengan error 404. Uji dulu sebelum dipakai serius.
        </p>
      )}
    </div>
  );
}

export function SettingsPanel() {
  const [info, setInfo] = useState<SettingsInfo | null>(null);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  // --- pemilihan model ---
  const [models, setModels] = useState<ModelOption[]>([]);
  const [model, setModel] = useState("");
  const [classifyModel, setClassifyModel] = useState("");
  const [modelBusy, setModelBusy] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const [modelStatus, setModelStatus] = useState<string | null>(null);

  // --- statistik "Sering ditanyakan" ---
  const [statsBusy, setStatsBusy] = useState(false);
  const [statsStatus, setStatsStatus] = useState<string | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);

  function applyInfo(s: SettingsInfo) {
    setInfo(s);
    setPrompt(s.system_prompt);
    setModel(s.model);
    setClassifyModel(s.classify_model);
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      applyInfo(await getSettings());
      try {
        setModels(await listModels());
      } catch (e) {
        // daftar model gagal dimuat bukan alasan seluruh panel ikut mati
        setModelError(errMsg(e));
      }
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onSave() {
    if (busy) return;
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      applyInfo(await updateSettings({ system_prompt: prompt }));
      setStatus("System prompt tersimpan.");
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  async function onReset() {
    if (busy || !info) return;
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      // string kosong = backend mengembalikan ke default
      applyInfo(await updateSettings({ system_prompt: "" }));
      setStatus("Dikembalikan ke system prompt default.");
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  async function onSaveModel() {
    if (modelBusy) return;
    setModelBusy(true);
    setModelError(null);
    setModelStatus(null);
    try {
      applyInfo(await updateSettings({ model, classify_model: classifyModel }));
      setModelStatus("Model tersimpan. Langsung berlaku, tanpa restart server.");
    } catch (e) {
      setModelError(errMsg(e));
    } finally {
      setModelBusy(false);
    }
  }

  async function onResetModel() {
    if (modelBusy) return;
    setModelBusy(true);
    setModelError(null);
    setModelStatus(null);
    try {
      applyInfo(await updateSettings({ model: "", classify_model: "" }));
      setModelStatus("Model dikembalikan ke default.");
    } catch (e) {
      setModelError(errMsg(e));
    } finally {
      setModelBusy(false);
    }
  }

  async function onRefreshModels() {
    if (modelBusy) return;
    setModelBusy(true);
    setModelError(null);
    setModelStatus(null);
    try {
      setModels(await listModels(true));
      setModelStatus("Daftar model diperbarui.");
    } catch (e) {
      setModelError(errMsg(e));
    } finally {
      setModelBusy(false);
    }
  }

  async function onResetStats() {
    if (statsBusy) return;
    if (
      !window.confirm(
        "Kosongkan semua statistik pertanyaan populer? Tindakan ini tidak bisa dibatalkan."
      )
    ) {
      return;
    }
    setStatsBusy(true);
    setStatsError(null);
    setStatsStatus(null);
    try {
      const { deleted } = await resetPopularQuestions();
      setStatsStatus(`Statistik dikosongkan (${deleted} entri dihapus).`);
    } catch (e) {
      setStatsError(errMsg(e));
    } finally {
      setStatsBusy(false);
    }
  }

  const options = withCurrent(models, model, classifyModel);
  const modelDirty = !!info && (model !== info.model || classifyModel !== info.classify_model);

  return (
    <div className="h-full overflow-y-auto bg-jet-100 dark:bg-night-950">
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <section className={`p-4 sm:p-6 ${CARD}`}>
          <h2 className="text-base font-semibold text-navy dark:text-jet-100">System Prompt</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-brand-200/70">
            Atur gaya &amp; aturan jawaban AI sebebas mungkin. Ini instruksi dasar yang dipakai
            model untuk setiap jawaban ke user (mis. nada bicara, bahasa, batasan, format jawaban).
          </p>

          {loading ? (
            <p className="mt-4 text-sm text-slate-400 dark:text-brand-200/60">Memuat...</p>
          ) : (
            <>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={12}
                disabled={busy}
                placeholder="Tulis instruksi untuk AI di sini..."
                className={`mt-4 leading-relaxed ${FIELD}`}
              />
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-slate-400 dark:text-brand-200/60">
                  {info?.is_custom
                    ? "Status: memakai prompt kustom"
                    : "Status: memakai prompt default"}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void onReset()}
                    disabled={busy}
                    className={SECONDARY_BTN}
                  >
                    Reset ke default
                  </button>
                  <button
                    type="button"
                    onClick={() => void onSave()}
                    disabled={busy || !prompt.trim()}
                    className={PRIMARY_BTN}
                  >
                    {busy ? "Menyimpan..." : "Simpan"}
                  </button>
                </div>
              </div>
              {status && (
                <p className="mt-3 text-sm text-brand-700 dark:text-brand-300">{status}</p>
              )}
              {error && <p className="mt-3 text-sm text-blush dark:text-blush-400">{error}</p>}
            </>
          )}
        </section>

        <section className={`p-4 sm:p-6 ${CARD}`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-navy dark:text-jet-100">Model AI</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-brand-200/70">
                Kuota gratis dihitung per model: 20 permintaan per hari untuk tiap model. Kalau
                kuota satu model habis, pindah ke model lain di sini tanpa perlu restart server.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void onRefreshModels()}
              disabled={modelBusy || loading}
              className={
                "shrink-0 rounded-xl border px-3 py-1.5 text-xs transition disabled:opacity-40 " +
                "border-slate-200 text-jet-700 hover:bg-jet-100 " +
                "dark:border-night-600 dark:text-brand-100 dark:hover:bg-night-800"
              }
            >
              Muat ulang daftar
            </button>
          </div>

          {loading ? (
            <p className="mt-4 text-sm text-slate-400 dark:text-brand-200/60">Memuat...</p>
          ) : (
            <>
              <div className="mt-5 space-y-5">
                <ModelSelect
                  label="Model penjawab"
                  hint="Dipakai untuk menjawab pertanyaan di chat."
                  value={model}
                  options={options}
                  disabled={modelBusy}
                  onChange={setModel}
                />
                <ModelSelect
                  label="Model saran metadata"
                  hint='Dipakai tombol "Sarankan (AI)" saat menambah dokumen. Sengaja dipisah supaya tidak menghabiskan kuota bot.'
                  value={classifyModel}
                  options={options}
                  disabled={modelBusy}
                  onChange={setClassifyModel}
                />
              </div>

              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-slate-400 dark:text-brand-200/60">
                  Default: {info?.default_model || "-"} / {info?.default_classify_model || "-"}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void onResetModel()}
                    disabled={modelBusy}
                    className={SECONDARY_BTN}
                  >
                    Reset ke default
                  </button>
                  <button
                    type="button"
                    onClick={() => void onSaveModel()}
                    disabled={modelBusy || !modelDirty || !model}
                    className={PRIMARY_BTN}
                  >
                    {modelBusy ? "Menyimpan..." : "Simpan model"}
                  </button>
                </div>
              </div>
              {modelStatus && (
                <p className="mt-3 text-sm text-brand-700 dark:text-brand-300">{modelStatus}</p>
              )}
              {modelError && (
                <p className="mt-3 text-sm text-blush dark:text-blush-400">{modelError}</p>
              )}
            </>
          )}
        </section>

        <section className={`p-4 sm:p-6 ${CARD}`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-navy dark:text-jet-100">
                Statistik "Sering ditanyakan"
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-brand-200/70">
                Daftar pertanyaan populer di empty-state chat dihitung otomatis dari
                pertanyaan yang masuk. Reset untuk mengosongkan hitungan (mis. setelah
                fase uji coba) dan mulai dari nol.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void onResetStats()}
              disabled={statsBusy}
              className={SECONDARY_BTN}
            >
              {statsBusy ? "Mengosongkan..." : "Reset statistik"}
            </button>
          </div>
          {statsStatus && (
            <p className="mt-3 text-sm text-brand-700 dark:text-brand-300">{statsStatus}</p>
          )}
          {statsError && (
            <p className="mt-3 text-sm text-blush dark:text-blush-400">{statsError}</p>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-jet-100 p-6 dark:border-night-700 dark:bg-night-900/60">
          <h3 className="text-sm font-semibold text-navy dark:text-jet-100">
            Prompt default (referensi)
          </h3>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-500 dark:text-brand-200/70">
            {info?.default_system_prompt ?? "-"}
          </p>
        </section>
      </div>
    </div>
  );
}
