import { useEffect, useMemo, useState } from "react";
import { deleteAuditLog, getAuditLogs, type AuditEvent } from "../lib/api";

const CARD =
  "rounded-2xl border border-slate-200 bg-white dark:border-night-700 dark:bg-night-900";

const GHOST_BTN =
  "rounded-lg border px-2.5 py-1 text-xs transition " +
  "border-slate-200 text-jet-700 hover:bg-jet-100 " +
  "dark:border-night-600 dark:text-brand-100 dark:hover:bg-night-800";

const DANGER_BTN =
  "rounded-lg border px-2.5 py-1 text-xs transition " +
  "border-red-200 text-red-600 hover:bg-red-50 " +
  "dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10";

function fmt(iso: string): string {
  if (!iso) return "\u2014";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

type ActionMeta = { label: string; icon: string; cls: string };

/** Pemetaan kode aksi -> label ramah + warna badge. */
const ACTIONS: Record<string, ActionMeta> = {
  "document.create": {
    label: "Upload dokumen",
    icon: "\uD83D\uDCE4",
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-700",
  },
  "document.update": {
    label: "Perbarui dokumen",
    icon: "\u270F\uFE0F",
    cls: "bg-ocean-50 text-navy border-ocean-100 dark:bg-navy-600/25 dark:text-ocean dark:border-navy-600",
  },
  "document.delete": {
    label: "Hapus dokumen",
    icon: "\uD83D\uDDD1\uFE0F",
    cls: "bg-blush-50 text-blush border-blush/40 dark:bg-blush/10 dark:text-blush-400 dark:border-blush/30",
  },
  "kb.reset": {
    label: "Reset knowledge base",
    icon: "\u267B\uFE0F",
    cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-700",
  },
  "settings.update": {
    label: "Ubah setelan (System Prompt)",
    icon: "\u2699\uFE0F",
    cls: "bg-jet-100 text-jet-700 border-slate-200 dark:bg-night-800 dark:text-brand-100/80 dark:border-night-600",
  },
};

function actionMeta(action: string): ActionMeta {
  return (
    ACTIONS[action] || {
      label: action || "Aktivitas",
      icon: "\u2022",
      cls: "bg-jet-100 text-jet-700 border-slate-200 dark:bg-night-800 dark:text-brand-100/80 dark:border-night-600",
    }
  );
}

/** Ringkas isi `details` jadi teks pendek untuk kolom keterangan. */
function describeDetails(ev: AuditEvent): string {
  const d = ev.details || {};
  if (ev.action === "kb.reset" && typeof d.deleted === "number") {
    return `${d.deleted} dokumen dihapus`;
  }
  if (ev.action === "settings.update" && Array.isArray(d.changed)) {
    const map: Record<string, string> = {
      system_prompt: "System prompt",
      model: "Model penjawab",
      classify_model: "Model saran",
      chunk_max_tokens: "Ukuran chunk",
      chunk_overlap_tokens: "Overlap chunk",
    };
    const labels = (d.changed as string[]).map((c) => map[c] || c);
    return labels.length ? labels.join(", ") : "\u2014";
  }
  if (typeof d.via === "string") {
    return d.via === "file" ? "via file" : "via teks";
  }
  return "\u2014";
}

/**
 * Log Aktivitas (sisi admin): jejak siapa yang mengubah knowledge base — upload,
 * perbarui, hapus dokumen, reset KB, dan ubah setelan (Kelola DB). Terbaru di
 * atas. Bisa disaring per jenis aksi.
 */
export function AuditLogPanel() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setEvents(await getAuditLogs({ limit: 500 }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat log aktivitas.");
    } finally {
      setLoading(false);
    }
  }

  async function removeEvent(id: number) {
    if (!window.confirm("Hapus permanen entri log ini?")) return;
    try {
      await deleteAuditLog(id);
      setEvents((prev) => prev.filter((e) => e.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menghapus log.");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const shown = useMemo(
    () => (filter ? events.filter((e) => e.action === filter) : events),
    [events, filter],
  );

  return (
    <div className="h-full overflow-y-auto bg-jet-100 dark:bg-night-950">
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-navy dark:text-jet-100">Log Aktivitas</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-brand-200/70">
              Jejak siapa yang mengubah knowledge base: upload, perbarui, atau hapus dokumen, reset
              KB, dan perubahan setelan di System Prompt. Terbaru ditampilkan paling atas.
              Entri otomatis terhapus permanen setelah 60 hari.
            </p>
          </div>
          <button type="button" onClick={() => void load()} className={GHOST_BTN}>
            Muat ulang
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            title="Saring berdasarkan jenis aksi"
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-jet-700 dark:border-night-600 dark:bg-night-800 dark:text-brand-100"
          >
            <option value="">Semua aksi</option>
            <option value="document.create">Upload dokumen</option>
            <option value="document.update">Perbarui dokumen</option>
            <option value="document.delete">Hapus dokumen</option>
            <option value="kb.reset">Reset KB</option>
            <option value="settings.update">Ubah setelan</option>
          </select>
          {!loading && !error && (
            <span className={`px-3 py-1 text-xs text-slate-500 dark:text-brand-200/70 ${CARD}`}>
              Total: <b className="text-jet-700 dark:text-jet-100">{shown.length}</b> aktivitas
            </span>
          )}
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        )}

        <div className={`overflow-hidden ${CARD}`}>
          {loading ? (
            <p className="px-5 py-6 text-sm text-slate-500 dark:text-brand-200/70">Memuat...</p>
          ) : shown.length === 0 ? (
            <p className="px-5 py-6 text-sm text-slate-500 dark:text-brand-200/70">
              Belum ada aktivitas tercatat. Coba upload atau ubah sebuah dokumen.
            </p>
          ) : (
            <>
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400 dark:border-night-700 dark:text-brand-200/60">
                  <tr>
                    <th className="px-4 py-3 font-medium">Waktu</th>
                    <th className="px-4 py-3 font-medium">Pengguna</th>
                    <th className="px-4 py-3 font-medium">Aksi</th>
                    <th className="px-4 py-3 font-medium">Objek</th>
                    <th className="px-4 py-3 font-medium">Keterangan</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-night-800">
                  {shown.map((ev) => {
                    const meta = actionMeta(ev.action);
                    return (
                      <tr key={ev.id} className="hover:bg-jet-50 dark:hover:bg-night-800/50">
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500 dark:text-brand-200/70">
                          {fmt(ev.ts)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-jet-700 dark:text-brand-100">
                            {ev.username || "\u2014"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${meta.cls}`}
                          >
                            {meta.label}
                          </span>
                        </td>
                        <td className="max-w-xs px-4 py-3">
                          <span className="line-clamp-2 text-jet-700 dark:text-brand-100">
                            {ev.target || "\u2014"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 dark:text-brand-200/70">
                          {describeDetails(ev)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => void removeEvent(ev.id)}
                            className={DANGER_BTN}
                          >
                            Hapus
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-slate-100 sm:hidden dark:divide-night-800">
              {shown.map((ev) => {
                const meta = actionMeta(ev.action);
                const details = describeDetails(ev);
                return (
                  <li key={ev.id} className="space-y-1.5 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${meta.cls}`}
                      >
                        {meta.label}
                      </span>
                      <span className="shrink-0 text-[11px] text-slate-400 dark:text-brand-200/60">
                        {fmt(ev.ts)}
                      </span>
                    </div>
                    {ev.target && (
                      <div className="line-clamp-2 text-sm text-jet-700 dark:text-brand-100">
                        {ev.target}
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-x-2 text-xs text-slate-400 dark:text-brand-200/60">
                        <span className="font-medium text-slate-500 dark:text-brand-200/80">
                          {ev.username || "—"}
                        </span>
                        {details !== "—" && <span>· {details}</span>}
                      </div>
                      <button
                        type="button"
                        onClick={() => void removeEvent(ev.id)}
                        className={`${DANGER_BTN} shrink-0`}
                      >
                        Hapus
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
