import type { Citation } from "../../../lib/types";

/** Menampilkan daftar sitasi sebagai chip: sumber + nomor halaman + snippet (tooltip). */
export function CitationCard({ citations }: { citations: Citation[] }) {
  if (!citations || citations.length === 0) return null;
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {citations.map((c, i) => (
        <span
          key={i}
          title={c.snippet ?? ""}
          className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
        >
          <span aria-hidden>📄</span>
          <span className="font-medium">{c.source}</span>
          {c.page !== undefined && c.page !== "" && (
            <span className="text-slate-400">· Hal. {c.page}</span>
          )}
        </span>
      ))}
    </div>
  );
}
