import StatusBadge from "./components/StatusBadge";
import { BrandAvatar } from "./components/ui/BrandAvatar";
import { ThemeToggle } from "./components/ui/ThemeToggle";
import { ChatPanel } from "./features/chat/components/ChatPanel";
import { useEndUser } from "./features/enduser/EndUserAuthGate";

/**
 * Halaman end-user (rute "/"): ruang chat penuh & bersih.
 *
 * Chat digembok — user WAJIB login/daftar (lihat EndUserAuthGate) sebelum
 * bisa bertanya. Identitas login dikirim otomatis lewat token pada tiap
 * pertanyaan, sehingga riwayat tercatat atas nama user (bukan anonim) di
 * halaman Riwayat Pengguna dashboard admin. Multi-turn aktif agar bot ingat
 * konteks.
 */
export default function EndUserApp() {
  const { user, logout } = useEndUser();
  const label = user.name || user.username;
  return (
    <div
      data-theme-root
      className="flex h-screen flex-col bg-jet-100 text-jet-700 dark:bg-night-950 dark:text-jet-100"
    >
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 dark:border-night-700 dark:bg-night-900 sm:px-6">
        <BrandAvatar className="h-9 w-9" rounded="full" alt="Cobee" />
        <div className="min-w-0">
          <p className="font-semibold leading-tight text-navy dark:text-jet-100">Cobee</p>
          <p className="truncate text-xs text-slate-500 dark:text-brand-200/70">
            Asisten FAQ Timedoor — tanya apa saja
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span
            title={user.username}
            className="hidden max-w-[12rem] items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-jet-700 dark:border-night-700 dark:bg-night-800 dark:text-jet-100 sm:flex"
          >
            <span aria-hidden="true">👤</span>
            <span className="truncate">{label}</span>
          </span>
          <button
            type="button"
            onClick={logout}
            title="Keluar"
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-jet-100 dark:border-night-700 dark:text-brand-100 dark:hover:bg-night-800"
          >
            Keluar
          </button>
          <StatusBadge />
          <ThemeToggle />
        </div>
      </header>

      <main className="min-h-0 flex-1">
        <ChatPanel active showFilter={false} multiTurn />
      </main>
    </div>
  );
}
