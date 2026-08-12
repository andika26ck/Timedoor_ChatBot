import { useEffect, type ReactNode } from "react";
import { cn } from "../../../lib/cn";
import { ChatHeader } from "./ChatHeader";

interface ChatWindowProps {
  open: boolean;
  isExpanded: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  onToggleExpand: () => void;
  children: ReactNode;
}

/**
 * Jendela panel chat mengambang. Mobile: full-screen. Desktop: panel kanan
 * bawah, bisa diperbesar. Esc untuk menutup.
 */
export function ChatWindow({
  open,
  isExpanded,
  title,
  subtitle,
  onClose,
  onToggleExpand,
  children,
}: ChatWindowProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <div
      role="dialog"
      aria-label={title}
      aria-hidden={!open}
      data-td-chat
      className={cn(
        "pointer-events-none fixed z-[2147483000] flex flex-col overflow-hidden shadow-2xl transition-all duration-200",
        "bg-white text-jet-700 dark:bg-night-950 dark:text-jet-100",
        // Mobile: full screen
        "inset-0 rounded-none",
        // Desktop: panel kanan bawah
        "sm:inset-auto sm:bottom-24 sm:right-6 sm:rounded-2xl sm:border sm:border-slate-200 sm:dark:border-night-700",
        isExpanded
          ? "sm:h-[85vh] sm:max-h-[760px] sm:w-[440px]"
          : "sm:h-[600px] sm:max-h-[75vh] sm:w-[384px]",
        open ? "pointer-events-auto translate-y-0 opacity-100" : "translate-y-4 opacity-0",
      )}
    >
      <ChatHeader
        title={title}
        subtitle={subtitle}
        isExpanded={isExpanded}
        onClose={onClose}
        onToggleExpand={onToggleExpand}
      />
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}
