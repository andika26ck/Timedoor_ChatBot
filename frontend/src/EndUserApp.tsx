import StatusBadge from "./components/StatusBadge";
import { BrandAvatar } from "./components/ui/BrandAvatar";
import { ThemeToggle } from "./components/ui/ThemeToggle";
import { ChatPanel } from "./features/chat/components/ChatPanel";

/**
 * Halaman end-user (rute "/"): ruang chat penuh & bersih.
 *
 * Berbeda dari dashboard admin ("/admin"), halaman ini TIDAK punya menu
 * Dokumen/Kelola DB/Riwayat. Fokusnya cuma bertanya ke Cobee. Multi-turn aktif
 * agar bot mengingat konteks; tiap pertanyaan otomatis tercatat (anonim) di
 * server untuk dipantau admin di halaman Riwayat Pengguna.
 */
export default function EndUserApp() {
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
