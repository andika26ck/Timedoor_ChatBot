import StatusBadge from "./components/StatusBadge";
import { BrandAvatar } from "./components/ui/BrandAvatar";
import { ThemeToggle } from "./components/ui/ThemeToggle";
import { ChatPanel } from "./features/chat/components/ChatPanel";
import { IdentityDialog } from "./features/enduser/IdentityDialog";
import { useEndUserIdentity } from "./features/enduser/identity";

/**
 * Halaman end-user (rute "/"): ruang chat penuh & bersih.
 *
 * Berbeda dari dashboard admin ("/admin"), halaman ini TIDAK punya menu
 * Dokumen/Kelola DB/Riwayat. Fokusnya cuma bertanya ke Cobee. Multi-turn aktif
 * agar bot mengingat konteks; tiap pertanyaan otomatis tercatat (anonim) di
 * server untuk dipantau admin di halaman Riwayat Pengguna.
 */
export default function EndUserApp() {
  const id = useEndUserIdentity();
  const dialogOpen = id.editorOpen || id.needsPrompt;
  const label = id.identity.userName || id.identity.userEmail;
  return (
    <>
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
          {id.hasIdentity ? (
            <button
              type="button"
              onClick={id.openEditor}
              title="Ubah identitas"
              className="flex max-w-[10rem] items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-jet-700 hover:bg-jet-100 dark:border-night-700 dark:bg-night-800 dark:text-jet-100 dark:hover:bg-night-700"
            >
              <span aria-hidden="true">👤</span>
              <span className="truncate">{label}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={id.openEditor}
              className="rounded-full border border-brand-500 px-3 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50 dark:border-brand-500/60 dark:text-brand-200 dark:hover:bg-night-800"
            >
              Isi identitas
            </button>
          )}
          <StatusBadge />
          <ThemeToggle />
        </div>
      </header>

      <main className="min-h-0 flex-1">
        <ChatPanel active showFilter={false} multiTurn />
      </main>
    </div>
    <IdentityDialog
      open={dialogOpen}
      initial={id.identity}
      allowSkip={id.needsPrompt && !id.editorOpen}
      onSave={id.save}
      onSkip={id.skip}
      onClose={id.closeEditor}
    />
    </>
  );
}
