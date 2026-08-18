import { useMemo } from "react";
import type { Conversation } from "../types";

interface ConversationSidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onNew: () => void;
  onSelect: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className="h-4 w-4"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
    >
      <path d="M10 4v12M4 10h12" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className="h-3.5 w-3.5"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 13.5V16h2.5l7-7L11 6.5l-7 7Z" />
      <path d="M12.5 5 15 7.5" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className="h-3.5 w-3.5"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 6h12" />
      <path d="M8 6V4.5h4V6" />
      <path d="M6 6l.5 9h7l.5-9" />
    </svg>
  );
}

/**
 * Sidebar daftar percakapan tersimpan (fitur "Riwayat percakapan").
 * Hanya dipakai di dashboard admin. Data percakapan disimpan di localStorage
 * lewat hook useChat (opsi persist).
 */
export function ConversationSidebar({
  conversations,
  activeId,
  onNew,
  onSelect,
  onRename,
  onDelete,
}: ConversationSidebarProps) {
  const sorted = useMemo(
    () => [...conversations].sort((a, b) => b.updatedAt - a.updatedAt),
    [conversations],
  );

  return (
    <div className="flex h-full w-60 shrink-0 flex-col border-r border-slate-200 bg-white dark:border-night-700 dark:bg-night-900">
      <div className="p-3">
        <button
          type="button"
          onClick={onNew}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
        >
          <PlusIcon /> Chat Baru
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {sorted.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-slate-400 dark:text-brand-200/50">
            Belum ada percakapan.
          </p>
        ) : (
          <ul className="space-y-1">
            {sorted.map((c) => {
              const isActive = c.id === activeId;
              return (
                <li key={c.id}>
                  <div
                    className={
                      "group flex items-center gap-1 rounded-lg px-2 py-2 text-sm transition " +
                      (isActive
                        ? "bg-brand-50 text-navy dark:bg-night-800 dark:text-jet-100"
                        : "text-jet-700 hover:bg-slate-100 dark:text-brand-100 dark:hover:bg-night-800/70")
                    }
                  >
                    <button
                      type="button"
                      onClick={() => onSelect(c.id)}
                      className="min-w-0 flex-1 truncate text-left"
                      title={c.title}
                    >
                      {c.title || "Percakapan baru"}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const next = window.prompt("Ganti nama percakapan:", c.title);
                        if (next && next.trim()) onRename(c.id, next.trim());
                      }}
                      className="shrink-0 rounded p-1 text-slate-400 opacity-0 transition hover:text-brand-600 group-hover:opacity-100 dark:hover:text-brand-300"
                      aria-label="Ganti nama percakapan"
                      title="Ganti nama"
                    >
                      <PencilIcon />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Hapus percakapan "${c.title}"?`)) onDelete(c.id);
                      }}
                      className="shrink-0 rounded p-1 text-slate-400 opacity-0 transition hover:text-red-500 group-hover:opacity-100"
                      aria-label="Hapus percakapan"
                      title="Hapus"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
