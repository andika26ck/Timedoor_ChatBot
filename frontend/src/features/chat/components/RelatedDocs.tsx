import type { RelatedDoc } from "../../../lib/types";

/** Chip "Baca juga" dari field dokumen_terkait. */
export function RelatedDocs({ related }: { related: RelatedDoc[] }) {
  if (!related || related.length === 0) return null;
  return (
    <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 dark:border-slate-700 dark:bg-slate-800/60">
      <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">
        Baca juga
      </div>
      <div className="flex flex-wrap gap-1.5">
        {related.map((r, i) => (
          <span
            key={i}
            title={r.domain ? `Domain: ${r.domain}` : undefined}
            className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-2 py-0.5 text-xs text-brand-700 dark:border-brand-800 dark:bg-brand-950/50 dark:text-brand-300"
          >
            🔗 {r.source}
            {r.domain && <span className="text-brand-400">· {r.domain}</span>}
          </span>
        ))}
      </div>
    </div>
  );
}
