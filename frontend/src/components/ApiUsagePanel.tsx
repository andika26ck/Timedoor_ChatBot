import { useCallback, useEffect, useMemo, useState } from "react";
import { getApiUsage, type ApiUsageResult } from "../lib/api";

const CARD =
  "rounded-2xl border border-slate-200 bg-white dark:border-night-700 dark:bg-night-900";

const GHOST_BTN =
  "rounded-lg border px-2.5 py-1 text-xs transition " +
  "border-slate-200 text-jet-700 hover:bg-jet-100 disabled:cursor-not-allowed disabled:opacity-40 " +
  "dark:border-night-600 dark:text-brand-100 dark:hover:bg-night-800";

const SELECT =
  "rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-jet-700 " +
  "dark:border-night-600 dark:bg-night-800 dark:text-brand-100";

const PAGE_SIZE = 10;

function fmt(iso: string): string {
  if (!iso) return "\u2014";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

/** Label tanggal ringkas untuk sumbu grafik (mis. "20/8"). */
function dayLabel(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return `${d.getUTCDate()}/${d.getUTCMonth() + 1}`;
}

/** Warna badge sederhana per endpoint. */
function actionMeta(action: string): { label: string; cls: string } {
  if (action === "api.ask_stream") {
    return {
      label: "/ask/stream",
      cls: "bg-ocean-50 text-navy border-ocean-100 dark:bg-navy-600/25 dark:text-ocean dark:border-navy-600",
    };
  }
  if (action === "api.ask") {
    return {
      label: "/ask",
      cls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-700",
    };
  }
  return {
    label: action || "api",
    cls: "bg-jet-100 text-jet-700 border-slate-200 dark:bg-night-800 dark:text-brand-100/80 dark:border-night-600",
  };
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className={`px-4 py-3 ${CARD}`}>
      <div className="text-2xl font-semibold text-navy dark:text-jet-100">
        {value.toLocaleString("id-ID")}
      </div>
      <div className="mt-0.5 text-xs text-slate-500 dark:text-brand-200/70">{label}</div>
    </div>
  );
}

/** Grafik batang tren harian (murni CSS, tanpa dependency). */
function TrendChart({ daily }: { daily: { date: string; count: number }[] }) {
  const max = Math.max(1, ...daily.map((d) => d.count));
  return (
    <div className={`px-4 py-4 ${CARD}`}>
      <div className="mb-3 text-sm font-medium text-navy dark:text-jet-100">
        Tren harian (panggilan / hari)
      </div>
      {daily.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-brand-200/70">Belum ada data.</p>
      ) : (
        <div className="flex h-40 items-end gap-1 overflow-x-auto">
          {daily.map((d) => {
            const pct = Math.round((d.count / max) * 100);
            return (
              <div
                key={d.date}
                className="flex min-w-[14px] flex-1 flex-col items-center gap-1"
                title={`${d.date}: ${d.count} panggilan`}
              >
                <div className="flex h-32 w-full items-end">
                  <div
                    className="w-full rounded-t bg-brand-500/80 transition-all hover:bg-brand-500 dark:bg-brand-400/70 dark:hover:bg-brand-400"
                    style={{ height: `${d.count === 0 ? 2 : Math.max(pct, 4)}%` }}
                  />
                </div>
                <span className="whitespace-nowrap text-[10px] text-slate-400 dark:text-brand-200/60">
                  {dayLabel(d.date)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Tab "Penggunaan API": pemantauan panggilan API per konsumen (widget/CMS).
 * Sengaja terpisah dari "Aktivitas Admin" karena ini pemakaian layanan
 * (read-only), bukan perubahan knowledge base. Menyajikan ringkasan angka,
 * tren harian, dan tabel berpaginasi yang bisa disaring per konsumen.
 */
export function ApiUsagePanel() {
  const [data, setData] = useState<ApiUsageResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [consumer, setConsumer] = useState<string>("");
  const [days, setDays] = useState<number>(14);
  const [page, setPage] = useState<number>(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(
        await getApiUsage({
          consumer: consumer || undefined,
          days,
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat penggunaan API.");
    } finally {
      setLoading(false);
    }
  }, [consumer, days, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = data?.summary;
  const rows = data?.rows ?? [];
  const totalRows = data?.total_rows ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));

  const consumerOptions = useMemo(
    () => (summary?.consumers ?? []).map((c) => c.consumer).filter(Boolean),
    [summary],
  );

  return (
    <div className="h-full overflow-y-auto bg-jet-100 dark:bg-night-950">
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-navy dark:text-jet-100">Penggunaan API</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-brand-200/70">
              Pemantauan panggilan API oleh konsumen (widget &amp; server CMS). Angka ringkasan,
              tren harian, dan riwayat panggilan. Terpisah dari Aktivitas Admin agar mudah dibaca.
            </p>
          </div>
          <button type="button" onClick={() => void load()} className={GHOST_BTN}>
            Muat ulang
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Kartu ringkasan */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Total (semua waktu)" value={summary?.total ?? 0} />
          <StatCard label="24 jam terakhir" value={summary?.last_24h ?? 0} />
          <StatCard label="7 hari terakhir" value={summary?.last_7d ?? 0} />
          <StatCard label="30 hari terakhir" value={summary?.last_30d ?? 0} />
        </div>

        {/* Per konsumen */}
        {summary && summary.consumers.length > 0 && (
          <div className={`px-4 py-4 ${CARD}`}>
            <div className="mb-3 text-sm font-medium text-navy dark:text-jet-100">Per konsumen</div>
            <div className="flex flex-wrap gap-2">
              {summary.consumers.map((c) => (
                <div
                  key={c.consumer}
                  className="rounded-xl border border-slate-200 px-3 py-2 dark:border-night-600"
                >
                  <div className="font-mono text-xs text-jet-700 dark:text-brand-100">
                    {c.consumer || "\u2014"}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500 dark:text-brand-200/70">
                    <b className="text-jet-700 dark:text-jet-100">{c.count.toLocaleString("id-ID")}</b> total
                    <span className="mx-1">&middot;</span>
                    {c.last_7d.toLocaleString("id-ID")} (7h)
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Grafik tren harian */}
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs text-slate-500 dark:text-brand-200/70">Rentang tren:</label>
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} className={SELECT}>
            <option value={7}>7 hari</option>
            <option value={14}>14 hari</option>
            <option value={30}>30 hari</option>
          </select>
        </div>
        <TrendChart daily={summary?.daily ?? []} />

        {/* Filter tabel */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={consumer}
            onChange={(e) => {
              setPage(0);
              setConsumer(e.target.value);
            }}
            title="Saring berdasarkan konsumen"
            className={SELECT}
          >
            <option value="">Semua konsumen</option>
            {consumerOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          {!loading && !error && (
            <span className={`px-3 py-1 text-xs text-slate-500 dark:text-brand-200/70 ${CARD}`}>
              Total: <b className="text-jet-700 dark:text-jet-100">{totalRows.toLocaleString("id-ID")}</b> panggilan
            </span>
          )}
        </div>

        {/* Tabel */}
        <div className={`overflow-hidden ${CARD}`}>
          {loading ? (
            <p className="px-5 py-6 text-sm text-slate-500 dark:text-brand-200/70">Memuat...</p>
          ) : rows.length === 0 ? (
            <p className="px-5 py-6 text-sm text-slate-500 dark:text-brand-200/70">
              Belum ada panggilan API tercatat.
            </p>
          ) : (
            <>
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400 dark:border-night-700 dark:text-brand-200/60">
                    <tr>
                      <th className="px-4 py-3 font-medium">Waktu</th>
                      <th className="px-4 py-3 font-medium">Konsumen</th>
                      <th className="px-4 py-3 font-medium">Endpoint</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-night-800">
                    {rows.map((r) => {
                      const meta = actionMeta(r.action);
                      return (
                        <tr key={r.id} className="hover:bg-jet-50 dark:hover:bg-night-800/50">
                          <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500 dark:text-brand-200/70">
                            {fmt(r.ts)}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs text-jet-700 dark:text-brand-100">
                              {r.consumer || "\u2014"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[11px] font-medium ${meta.cls}`}
                            >
                              {meta.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <ul className="divide-y divide-slate-100 sm:hidden dark:divide-night-800">
                {rows.map((r) => {
                  const meta = actionMeta(r.action);
                  return (
                    <li key={r.id} className="space-y-1.5 px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[11px] font-medium ${meta.cls}`}
                        >
                          {meta.label}
                        </span>
                        <span className="shrink-0 text-[11px] text-slate-400 dark:text-brand-200/60">
                          {fmt(r.ts)}
                        </span>
                      </div>
                      <div className="font-mono text-xs text-jet-700 dark:text-brand-100">
                        {r.consumer || "\u2014"}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>

        {/* Pagination */}
        {totalRows > PAGE_SIZE && (
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-slate-500 dark:text-brand-200/70">
              Halaman {page + 1} dari {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0 || loading}
                className={GHOST_BTN}
              >
                Sebelumnya
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => (p + 1 < totalPages ? p + 1 : p))}
                disabled={page + 1 >= totalPages || loading}
                className={GHOST_BTN}
              >
                Berikutnya
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
