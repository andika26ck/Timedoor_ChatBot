import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Pemilih topik yang bisa dicari dan dikelompokkan per domain.
 *
 * Menggantikan <select> panjang yang harus di-scroll jauh. Admin baru bisa
 * langsung mengetik kata kunci ("attend") atau menelusuri per kelompok domain.
 * Kalau sebuah domain sedang dipilih, daftar otomatis menyusut hanya ke topik
 * milik domain itu.
 */
export interface TopicPickerProps {
  topicsByDomain: Record<string, string[]>;
  domain: string;
  value: string;
  onChange: (topic: string) => void;
}

type Group = { domain: string; topics: string[] };

export function TopicPicker({ topicsByDomain, domain, value, onChange }: TopicPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const groups: Group[] = useMemo(() => {
    const all = Object.entries(topicsByDomain)
      .filter(([, topics]) => topics.length > 0)
      .map(([d, topics]) => ({ domain: d, topics: [...topics].sort((a, b) => a.localeCompare(b)) }))
      .sort((a, b) => a.domain.localeCompare(b.domain));
    if (!domain) return all;
    const scoped = all.filter((g) => g.domain === domain);
    return scoped.length > 0 ? scoped : all;
  }, [topicsByDomain, domain]);

  const filtered: Group[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((g) => ({
        domain: g.domain,
        topics: g.topics.filter((t) => t.toLowerCase().includes(q)),
      }))
      .filter((g) => g.topics.length > 0);
  }, [groups, query]);

  const total = filtered.reduce((n, g) => n + g.topics.length, 0);

  function pick(topic: string) {
    onChange(topic);
    setQuery("");
    setOpen(false);
  }

  function itemClass(selected: boolean) {
    return (
      "w-full rounded-lg px-2 py-1.5 text-left text-xs transition " +
      (selected
        ? "bg-brand-50 font-medium text-brand-700 dark:bg-brand-500/20 dark:text-brand-200"
        : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800")
    );
  }

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Batasi pencarian ke satu label topik (Level 1)"
        className="flex max-w-[14rem] items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 transition hover:border-brand-300 focus:border-brand-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-brand-500"
      >
        <span className="truncate">{value || "Semua topik"}</span>
        <span className="text-slate-400">▾</span>
      </button>

      {open && (
        <div className="absolute bottom-full left-0 z-20 mb-1 w-72 rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
          <div className="border-b border-slate-100 p-2 dark:border-slate-800">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari topik..."
              className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs focus:border-brand-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder-slate-500"
            />
          </div>
          <div className="max-h-64 overflow-y-auto p-1">
            <button type="button" onClick={() => pick("")} className={itemClass(value === "")}>
              Semua topik
            </button>
            {total === 0 && (
              <p className="px-2 py-3 text-center text-xs text-slate-400 dark:text-slate-500">
                Tidak ada topik yang cocok.
              </p>
            )}
            {filtered.map((g) => (
              <div key={g.domain} className="mt-1">
                <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  {g.domain}
                </div>
                {g.topics.map((t) => (
                  <button
                    key={`${g.domain}-${t}`}
                    type="button"
                    onClick={() => pick(t)}
                    className={itemClass(value === t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
