/**
 * Kontrol pagination bersama untuk tabel admin (Riwayat & Log, Kelola User,
 * Penggunaan API). Halaman berbasis 0.
 *
 * - Menampilkan nomor halaman supaya jelas sedang di halaman berapa (aktif
 *   di-highlight) plus teks "Halaman X dari Y".
 * - Selalu menampilkan halaman kelipatan 5 (5, 10, 15, ...) sebagai pintasan
 *   lompat cepat, ditambah halaman pertama, terakhir, dan sekitar halaman aktif.
 *   Sisanya diringkas dengan "…".
 * - Otomatis sembunyi kalau cuma ada satu halaman.
 */
const GHOST_BTN =
  "rounded-lg border px-2.5 py-1 text-xs transition " +
  "border-slate-200 text-jet-700 hover:bg-jet-100 disabled:cursor-not-allowed disabled:opacity-40 " +
  "dark:border-night-600 dark:text-brand-100 dark:hover:bg-night-800";

const NUM_BTN =
  "min-w-[2rem] rounded-lg border px-2 py-1 text-xs transition " +
  "border-slate-200 text-jet-700 hover:bg-jet-100 disabled:cursor-not-allowed disabled:opacity-40 " +
  "dark:border-night-600 dark:text-brand-100 dark:hover:bg-night-800";

const NUM_BTN_ACTIVE =
  "min-w-[2rem] rounded-lg border px-2 py-1 text-xs font-semibold " +
  "border-brand-500 bg-brand-600 text-white " +
  "dark:border-brand-400 dark:bg-brand-500";

/** Susun daftar nomor halaman (berbasis 1) yang ditampilkan, dengan "gap". */
function buildPages(current: number, total: number): (number | "gap")[] {
  const wanted = new Set<number>();
  wanted.add(1);
  wanted.add(total);
  wanted.add(current);
  if (current - 1 >= 1) wanted.add(current - 1);
  if (current + 1 <= total) wanted.add(current + 1);
  // Pintasan lompat kelipatan 5: 5, 10, 15, ...
  for (let p = 5; p <= total; p += 5) wanted.add(p);
  const sorted = [...wanted]
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) out.push("gap");
    out.push(p);
    prev = p;
  }
  return out;
}

export function Pagination({
  page,
  totalPages,
  onPage,
  loading,
}: {
  /** Halaman aktif (berbasis 0). */
  page: number;
  totalPages: number;
  onPage: (next: number) => void;
  loading?: boolean;
}) {
  if (totalPages <= 1) return null;
  const current = page + 1; // berbasis 1 untuk tampilan
  const pages = buildPages(current, totalPages);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <span className="text-xs text-slate-500 dark:text-brand-200/70">
        Halaman {current} dari {totalPages}
      </span>
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPage(Math.max(0, page - 1))}
          disabled={page === 0 || loading}
          className={GHOST_BTN}
        >
          Sebelumnya
        </button>
        {pages.map((p, i) =>
          p === "gap" ? (
            <span
              key={`gap-${i}`}
              className="px-1 text-xs text-slate-400 dark:text-brand-200/50"
            >
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPage(p - 1)}
              disabled={loading}
              aria-current={p === current ? "page" : undefined}
              className={p === current ? NUM_BTN_ACTIVE : NUM_BTN}
            >
              {p}
            </button>
          ),
        )}
        <button
          type="button"
          onClick={() => onPage(page + 1 < totalPages ? page + 1 : page)}
          disabled={page + 1 >= totalPages || loading}
          className={GHOST_BTN}
        >
          Berikutnya
        </button>
      </div>
    </div>
  );
}
