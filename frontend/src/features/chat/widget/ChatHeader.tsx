import { BrandAvatar } from "../../../components/ui/BrandAvatar";
import { BrandTile } from "../../../components/ui/BrandTile";
import { ThemeToggle } from "../../../components/ui/ThemeToggle";

interface ChatHeaderProps {
  title: string;
  subtitle?: string;
  isExpanded: boolean;
  onClose: () => void;
  onToggleExpand: () => void;
}

/**
 * Header widget: avatar Cobee, judul, status, tombol tema/perbesar/tutup.
 *
 * Background tidak polos — dilapisi pattern tile brand Timedoor.
 * Light : brand-600 + tile putih transparan.
 * Dark  : night-900 + tile hijau brand-500 transparan (kontras aman,
 *         menghindari kombinasi "hijau di atas hijau" yang dilarang guideline).
 */
export function ChatHeader({
  title,
  subtitle,
  isExpanded,
  onClose,
  onToggleExpand,
}: ChatHeaderProps) {
  return (
    <div
      className={
        "relative isolate flex items-center gap-3 overflow-hidden px-4 py-3 text-white " +
        "border-b border-brand-500/30 bg-brand-600 " +
        "dark:border-night-700 dark:bg-night-900"
      }
    >
      {/* Lapisan pattern tile */}
      <BrandTile className="text-white/[0.14] dark:text-brand-500/20" size={96} />

      {/* Kilau lembut agar tile tidak terasa flat */}
      <div
        aria-hidden="true"
        className={
          "pointer-events-none absolute inset-0 -z-0 " +
          "bg-gradient-to-r from-brand-700/40 via-transparent to-brand-500/25 " +
          "dark:from-night-950/70 dark:via-transparent dark:to-brand-900/40"
        }
      />

      <div className="relative z-10 flex w-full items-center gap-3">
        <BrandAvatar className="h-9 w-9" rounded="full" alt="Cobee" />

        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{title}</div>
          <div className="flex items-center gap-1.5 text-xs text-white/90">
            <span className="h-2 w-2 rounded-full bg-brand-300 dark:bg-brand-400" />
            {subtitle ?? "Online"}
          </div>
        </div>

        <ThemeToggle className="text-white/90 hover:bg-white/10 hover:text-white dark:text-white/90 dark:hover:bg-white/10 dark:hover:text-white" />

        <button
          type="button"
          onClick={onToggleExpand}
          aria-label={isExpanded ? "Perkecil" : "Perbesar"}
          title={isExpanded ? "Perkecil" : "Perbesar"}
          className="hidden rounded-lg p-2 text-white/90 transition hover:bg-white/10 hover:text-white sm:block"
        >
          {isExpanded ? <ShrinkIcon /> : <ExpandIcon />}
        </button>

        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup"
          title="Tutup"
          className="rounded-lg p-2 text-white/90 transition hover:bg-white/10 hover:text-white"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function ExpandIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="15 3 21 3 21 9" />
      <polyline points="9 21 3 21 3 15" />
      <line x1="21" y1="3" x2="14" y2="10" />
      <line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  );
}

function ShrinkIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="4 14 10 14 10 20" />
      <polyline points="20 10 14 10 14 4" />
      <line x1="14" y1="10" x2="21" y2="3" />
      <line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  );
}
