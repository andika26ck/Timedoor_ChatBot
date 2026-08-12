import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

type ToastKind = "success" | "error" | "info";
interface ToastItem {
  id: string;
  text: string;
  kind: ToastKind;
}

interface ToastContextValue {
  toast: (text: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/** Provider toast ringan tanpa dependency (pengganti sonner). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const toast = useCallback((text: string, kind: ToastKind = "info") => {
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);
    setItems((prev) => [...prev, { id, text, kind }]);
  }, []);

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 left-1/2 z-[2147483600] flex -translate-x-1/2 flex-col items-center gap-2">
        {items.map((t) => (
          <Toast key={t.id} item={t} onDone={() => remove(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function Toast({ item, onDone }: { item: ToastItem; onDone: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const show = requestAnimationFrame(() => setVisible(true));
    const hide = setTimeout(() => setVisible(false), 2200);
    const done = setTimeout(onDone, 2500);
    return () => {
      cancelAnimationFrame(show);
      clearTimeout(hide);
      clearTimeout(done);
    };
  }, [onDone]);

  const color =
    item.kind === "success"
      ? "bg-emerald-600"
      : item.kind === "error"
        ? "bg-red-600"
        : "bg-slate-800";

  return (
    <div
      className={
        "pointer-events-auto rounded-lg px-3.5 py-2 text-sm font-medium text-white shadow-lg transition-all duration-200 " +
        color +
        " " +
        (visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0")
      }
    >
      {item.text}
    </div>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) return { toast: () => {} }; // fallback no-op agar aman di luar provider
  return ctx;
}
