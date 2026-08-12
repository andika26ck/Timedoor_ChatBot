interface EmptyStateProps {
  suggestions: string[];
  onPick: (text: string) => void;
}

/** Tampilan awal: sapaan + pertanyaan yang sering ditanyakan. */
export function EmptyState({ suggestions, onPick }: EmptyStateProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-4 text-center">
      <div className="text-4xl">💬</div>
      <h2 className="mt-3 text-lg font-semibold text-slate-700 dark:text-slate-100">
        Ada yang bisa dibantu?
      </h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Tanyakan apa saja seputar SOP, aturan, atau info internal Timedoor.
      </p>

      {suggestions.length > 0 && (
        <div className="mt-6 w-full max-w-lg">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
            Sering ditanyakan
          </div>
          <div className="flex flex-col gap-2">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => onPick(s)}
                className="group flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-left text-sm text-slate-700 transition hover:border-brand-300 hover:bg-brand-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-brand-700 dark:hover:bg-brand-950/40"
              >
                <span className="flex-1">{s}</span>
                <span className="text-slate-300 transition group-hover:text-brand-400">→</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
