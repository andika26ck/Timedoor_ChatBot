import { useState } from "react";
import { DocumentsPanel } from "./components/DocumentsPanel";
import { SettingsPanel } from "./components/SettingsPanel";
import StatusBadge from "./components/StatusBadge";
import { BrandAvatar } from "./components/ui/BrandAvatar";
import { BrandTile } from "./components/ui/BrandTile";
import { ThemeToggle } from "./components/ui/ThemeToggle";
import { ChatPanel } from "./features/chat/components/ChatPanel";
import { ChatWidget } from "./features/chat/widget/ChatWidget";

type View = "chat" | "docs" | "settings";

const TITLES: Record<View, string> = {
  chat: "Chat",
  docs: "Kelola Dokumen",
  settings: "Kelola DB",
};

export default function App() {
  const [view, setView] = useState<View>("chat");

  return (
    <div
      data-theme-root
      className="flex h-screen bg-jet-100 text-jet-700 dark:bg-night-950 dark:text-jet-100"
    >
      {/* Sidebar */}
      <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white dark:border-night-700 dark:bg-night-900">
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
            icon="💬"
            active={view === "chat"}
            onClick={() => setView("chat")}
          />
          <NavItem
            label="Dokumen"
            icon="📄"
            active={view === "docs"}
            onClick={() => setView("docs")}
          />
          <NavItem
            label="Kelola DB"
            icon="⚙️"
            active={view === "settings"}
            onClick={() => setView("settings")}
          />
        </nav>

        <div className="mt-auto border-t border-slate-100 p-4 text-xs text-slate-400 dark:border-night-700 dark:text-brand-200/60">
          Timedoor Academy · Internal
        </div>
      </aside>

      {/* Main */}
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center border-b border-slate-200 bg-white px-8 dark:border-night-700 dark:bg-night-900">
          <h1 className="text-sm font-semibold text-navy dark:text-jet-100">{TITLES[view]}</h1>
          <div className="ml-auto flex items-center gap-2">
            <StatusBadge />
            <ThemeToggle />
          </div>
        </header>

        <div className="min-h-0 flex-1">
          <div className={view === "chat" ? "h-full" : "hidden"}>
            <ChatPanel active={view === "chat"} showFilter withHistory multiTurn />
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
  icon: string;
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
      <span className="text-base">{icon}</span>
      {label}
    </button>
  );
}
