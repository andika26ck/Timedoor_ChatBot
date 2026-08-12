import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Auto-scroll ke bawah saat ada dependency baru, KECUALI user sedang
 * menggulir ke atas untuk membaca. Menyediakan tombol "scroll to bottom".
 */
export function useAutoScroll<T>(dep: T) {
  const ref = useRef<HTMLDivElement>(null);
  const [showButton, setShowButton] = useState(false);
  const stick = useRef(true);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = ref.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
    stick.current = true;
    setShowButton(false);
  }, []);

  const onScroll = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    const atBottom = distance < 80;
    stick.current = atBottom;
    setShowButton(!atBottom);
  }, []);

  useEffect(() => {
    if (stick.current) {
      const el = ref.current;
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [dep]);

  return { ref, showButton, scrollToBottom, onScroll };
}
