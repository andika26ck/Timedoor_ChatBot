import { useEffect, useState } from "react";
import { FloatingButton } from "./FloatingButton";
import { ChatWindow } from "./ChatWindow";
import { ChatPanel } from "../components/ChatPanel";
import { useLocalStorage } from "../hooks/useLocalStorage";

interface ChatWidgetProps {
  title?: string;
  subtitle?: string;
  defaultOpen?: boolean;
  /** Tampilkan filter domain/topik di dalam widget. Default: false (ringkas). */
  showFilter?: boolean;
}

/**
 * Widget chat mengambang gaya Intercom/Crisp: tombol bulat + panel.
 * Ini adalah komponen "produk" yang di-embed ke website lain.
 */
export function ChatWidget({
  title = "Timedoor Assistant",
  subtitle,
  defaultOpen = false,
  showFilter = false,
}: ChatWidgetProps) {
  const [open, setOpen] = useLocalStorage("tdc:chat-open", defaultOpen);
  const [expanded, setExpanded] = useState(false);

  // Kunci scroll body saat full-screen di mobile.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const isMobile = window.matchMedia("(max-width: 639px)").matches;
    if (open && isMobile) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  return (
    <>
      <ChatWindow
        open={open}
        isExpanded={expanded}
        title={title}
        subtitle={subtitle}
        onClose={() => setOpen(false)}
        onToggleExpand={() => setExpanded((v) => !v)}
      >
        <ChatPanel active={open} showFilter={showFilter} />
      </ChatWindow>

      <div data-td-chat className="fixed bottom-6 right-6 z-[2147483001]">
        <FloatingButton isOpen={open} onClick={() => setOpen((v) => !v)} />
      </div>
    </>
  );
}
