import { useState } from "react";
import { ApiUsagePanel } from "./ApiUsagePanel";
import { AuditLogPanel } from "./AuditLogPanel";
import { ChatLogsPanel } from "./ChatLogsPanel";

type Tab = "chats" | "audit" | "api";

/**
 * Menu gabungan "Riwayat & Log Aktivitas" dengan dua tab:
 * - Percakapan Pengguna: sesi anonim end-user yang memakai chatbot.
 * - Aktivitas Admin: jejak aksi admin (upload/edit/hapus dokumen, ubah setelan).
 *
 * Keduanya sengaja dipisah per tab karena beda audiens (pengguna vs admin),
 * tapi disatukan dalam satu menu agar sidebar lebih ringkas. Kedua panel tetap
 * ter-mount (pakai hidden) supaya data yang sudah dimuat tidak hilang saat
 * berpindah tab.
 */
const TAB_STORAGE_KEY = "cobee.admin.logs.tab";
const TABS: Tab[] = ["chats", "audit", "api"];

// Ingat sub-tab terakhir agar tidak balik ke awal setiap kali refresh.
function loadInitialTab(): Tab {
  if (typeof window === "undefined") return "chats";
  try {
    const saved = window.localStorage.getItem(TAB_STORAGE_KEY);
    if (saved && (TABS as string[]).includes(saved)) return saved as Tab;
  } catch {
    // localStorage bisa diblokir (mode privasi) — abaikan saja.
  }
  return "chats";
}

export function HistoryPanel() {
  const [tab, setTab] = useState<Tab>(loadInitialTab);

  // Pindah sub-tab sekaligus simpan pilihannya.
  function chooseTab(t: Tab) {
    setTab(t);
    try {
      window.localStorage.setItem(TAB_STORAGE_KEY, t);
    } catch {
      // abaikan bila localStorage tidak tersedia.
    }
  }

  return (
    <div className="flex h-full flex-col bg-jet-100 dark:bg-night-950">
      <div className="shrink-0 overflow-x-auto border-b border-slate-200 bg-white px-4 sm:px-6 dark:border-night-700 dark:bg-night-900">
        <div className="flex gap-1">
          <TabButton
            active={tab === "chats"}
            onClick={() => chooseTab("chats")}
            label="Percakapan Pengguna"
          />
          <TabButton
            active={tab === "audit"}
            onClick={() => chooseTab("audit")}
            label="Aktivitas Admin"
          />
          <TabButton
            active={tab === "api"}
            onClick={() => chooseTab("api")}
            label="Penggunaan API"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <div className={tab === "chats" ? "h-full" : "hidden"}>
          <ChatLogsPanel />
        </div>
        <div className={tab === "audit" ? "h-full" : "hidden"}>
          <AuditLogPanel />
        </div>
        <div className={tab === "api" ? "h-full" : "hidden"}>
          <ApiUsagePanel />
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition " +
        (active
          ? "border-brand-600 text-brand-700 dark:border-brand-400 dark:text-brand-200"
          : "border-transparent text-slate-500 hover:text-jet-700 dark:text-brand-200/60 dark:hover:text-brand-100")
      }
    >
      {label}
    </button>
  );
}
