import { useState } from "react";
import { AuditLogPanel } from "./AuditLogPanel";
import { ChatLogsPanel } from "./ChatLogsPanel";

type Tab = "chats" | "audit";

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
export function HistoryPanel() {
  const [tab, setTab] = useState<Tab>("chats");

  return (
    <div className="flex h-full flex-col bg-jet-100 dark:bg-night-950">
      <div className="shrink-0 overflow-x-auto border-b border-slate-200 bg-white px-4 sm:px-6 dark:border-night-700 dark:bg-night-900">
        <div className="flex gap-1">
          <TabButton
            active={tab === "chats"}
            onClick={() => setTab("chats")}
            label="Percakapan Pengguna"
          />
          <TabButton
            active={tab === "audit"}
            onClick={() => setTab("audit")}
            label="Aktivitas Admin"
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
