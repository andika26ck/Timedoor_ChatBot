/**
 * Kontrol pagination sederhana (Sebelumnya / Berikutnya) yang dipakai bersama
 * oleh tabel admin: tab Riwayat & Log dan Kelola User. Halaman berbasis 0.
 * Otomatis sembunyi kalau cuma ada satu halaman.
 */
const GHOST_BTN =
  "rounded-lg border px-2.5 py-1 text-xs transition " +
  "border-slate-200 text-jet-700 hover:bg-jet-100 disabled:cursor-not-allowed disabled:opacity-40 " +
  "dark:border-night-600 dark:text-brand-100 dark:hover:bg-night-800";

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
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-slate-500 dark:text-brand-200/70">
        Halaman {page + 1} dari {totalPages}
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onPage(Math.max(0, page - 1))}
          disabled={page === 0 || loading}
          className={GHOST_BTN}
        >
          Sebelumnya
        </button>
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
