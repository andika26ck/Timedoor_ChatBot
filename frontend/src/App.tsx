import { useState, type ReactNode } from "react";
import { DocumentsPanel } from "./components/DocumentsPanel";
import { HistoryPanel } from "./components/HistoryPanel";
import { SearchTestPanel } from "./components/SearchTestPanel";
import { SettingsPanel } from "./components/SettingsPanel";
import StatusBadge from "./components/StatusBadge";
import { BrandAvatar } from "./components/ui/BrandAvatar";
import { BrandTile } from "./components/ui/BrandTile";
import { ThemeToggle } from "./components/ui/ThemeToggle";
import { ChatPanel } from "./features/chat/components/ChatPanel";
import { ChatWidget } from "./features/chat/widget/ChatWidget";
import { useAuth } from "./features/auth/AuthGate";

type View = "chat" | "search" | "logs" | "docs" | "settings";

const TITLES: Record<View, string> = {
  chat: "Chat",
  search: "Uji Pencarian",
  logs: "Riwayat & Log Aktivitas",
  docs: "Kelola Dokumen",
  settings: "System Prompt",
};

export default function App() {
  const [view, setView] = useState<View>("chat");
  const [navOpen, setNavOpen] = useState(false);
  const { user, logout } = useAuth();

  // Pindah menu sekaligus tutup drawer (khusus tampilan mobile).
  function go(v: View) {
    setView(v);
    setNavOpen(false);
  }

  return (
    <div
      data-theme-root
      className="flex h-screen bg-jet-100 text-jet-700 dark:bg-night-950 dark:text-jet-100"
    >
      {/* Backdrop drawer (hanya mobile, saat menu terbuka) */}
      {navOpen && (
        <div
          className="fixed inset-0 z-30 bg-jet-900/40 backdrop-blur-sm md:hidden"
          onClick={() => setNavOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar: statis di desktop, drawer geser di mobile */}
      <aside
        className={
          "fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white transition-transform duration-200 md:static md:z-auto md:translate-x-0 dark:border-night-700 dark:bg-night-900 " +
          (navOpen ? "translate-x-0" : "-translate-x-full")
        }
      >
        {/*
          Kartu identitas Cobee — tidak polos, dilapisi pattern tile brand.
          Light : brand-600 + tile putih.
          Dark  : night-800 + tile brand-500.
        */}
        <div className="p-3">
          <div
            className={
              "relative isolate flex items-center gap-3 overflow-hidden rounded-2xl px-4 py-4 " +
              "bg-brand-600 text-white dark:bg-night-800"
            }
          >
            <BrandTile className="text-white/[0.14] dark:text-brand-500/20" size={96} />
            <div
              aria-hidden="true"
              className={
                "pointer-events-none absolute inset-0 " +
                "bg-gradient-to-br from-brand-700/40 via-transparent to-brand-400/25 " +
                "dark:from-night-950/60 dark:via-transparent dark:to-brand-900/40"
              }
            />
            <div className="relative z-10 flex items-center gap-3">
              <BrandAvatar className="h-10 w-10" rounded="full" alt="Cobee" />
              <div>
                <p className="font-semibold leading-tight">Cobee</p>
                <p className="text-xs text-white/85">Ask me anything!</p>
              </div>
            </div>
          </div>
        </div>

        <nav className="space-y-1 px-3 pb-3">
          <NavItem
            label="Chat"
            icon={<ChatIcon />}
            active={view === "chat"}
            onClick={() => go("chat")}
          />
          <NavItem
            label="Uji Pencarian"
            icon={<SearchIcon />}
            active={view === "search"}
            onClick={() => go("search")}
          />
          <NavItem
            label="Riwayat & Log"
            icon={<HistoryIcon />}
            active={view === "logs"}
            onClick={() => go("logs")}
          />
          <NavItem
            label="Dokumen"
            icon={<DocIcon />}
            active={view === "docs"}
            onClick={() => go("docs")}
          />
          <NavItem
            label="System Prompt"
            icon={<PromptIcon />}
            active={view === "settings"}
            onClick={() => go("settings")}
          />
        </nav>

        <div className="mt-auto border-t border-slate-100 p-4 text-xs text-slate-400 dark:border-night-700 dark:text-brand-200/60">
          Timedoor Academy · Internal
        </div>
      </aside>

      {/* Main */}
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-4 sm:px-6 md:px-8 dark:border-night-700 dark:bg-night-900">
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            aria-label="Buka menu"
            className="-ml-1 rounded-lg p-2 text-jet-600 transition hover:bg-jet-100 md:hidden dark:text-brand-100 dark:hover:bg-night-800"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <h1 className="min-w-0 truncate text-sm font-semibold text-navy dark:text-jet-100">
            {TITLES[view]}
          </h1>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden text-xs text-slate-500 dark:text-brand-200/70 sm:inline">
              {user.username}
            </span>
            <div className="hidden sm:block">
              <StatusBadge />
            </div>
            <ThemeToggle />
            <button
              type="button"
              onClick={logout}
              className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-night-700 dark:text-brand-100 dark:hover:bg-night-800"
            >
              Keluar
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1">
          <div className={view === "chat" ? "h-full" : "hidden"}>
            <ChatPanel active={view === "chat"} showFilter multiTurn />
          </div>
          <div className={view === "search" ? "h-full" : "hidden"}>
            <SearchTestPanel />
          </div>
          <div className={view === "logs" ? "h-full" : "hidden"}>
            <HistoryPanel />
          </div>
          <div className={view === "docs" ? "h-full" : "hidden"}>
            <DocumentsPanel />
          </div>
          <div className={view === "settings" ? "h-full" : "hidden"}>
            <SettingsPanel />
          </div>
        </div>
      </main>

      {/*
        Floating widget = produk yang akan di-embed ke website lain.
        Di dashboard ini dipakai sebagai live-preview. Untuk build embeddable
        gunakan entry src/widget.tsx (lihat README).
      */}
      <ChatWidget title="Cobee" subtitle="Ask Cobee Anything!" />
    </div>
  );
}

function NavItem({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition " +
        (active
          ? "bg-brand-600 text-white dark:bg-brand-700"
          : "text-jet-700 hover:bg-brand-50 dark:text-brand-100 dark:hover:bg-night-800")
      }
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center">{icon}</span>
      {label}
    </button>
  );
}

/* Ikon menu — bentuk abstrak & berwarna (bukan ikon garis generik). */
function ChatIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#fb7185" aria-hidden="true">
      <rect x="5" y="5" width="14" height="14" rx="5" transform="rotate(45 12 12)" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="9.5" cy="12" r="6" fill="#38bdf8" />
      <circle cx="15" cy="12" r="6" fill="#38bdf8" fillOpacity="0.55" />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#a78bfa" aria-hidden="true">
      <g transform="rotate(-15 12 12)">
        <rect x="4" y="6" width="16" height="3" rx="1.5" />
        <rect x="4" y="11" width="16" height="3" rx="1.5" fillOpacity="0.8" />
        <rect x="4" y="16" width="16" height="3" rx="1.5" fillOpacity="0.6" />
      </g>
    </svg>
  );
}

function DocIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#fbbf24" aria-hidden="true">
      <polygon points="12,2.5 20.5,7.25 20.5,16.75 12,21.5 3.5,16.75 3.5,7.25" />
    </svg>
  );
}

function PromptIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#fb923c" aria-hidden="true">
      <circle cx="12" cy="6.5" r="4.3" />
      <circle cx="12" cy="17.5" r="4.3" />
      <circle cx="6.5" cy="12" r="4.3" />
      <circle cx="17.5" cy="12" r="4.3" />
    </svg>
  );
}
