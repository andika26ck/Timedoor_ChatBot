import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

interface ConfirmContextValue {
  confirm: (opts: ConfirmOptions | string) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

const CANCEL_BTN =
  "rounded-xl border px-4 py-2 text-sm font-medium transition " +
  "border-slate-200 text-jet-700 hover:bg-jet-100 " +
  "dark:border-night-600 dark:text-brand-100 dark:hover:bg-night-800";

const PRIMARY_BTN =
  "rounded-xl px-4 py-2 text-sm font-medium text-white transition " +
  "bg-brand-600 hover:bg-brand-700";

const DANGER_BTN =
  "rounded-xl px-4 py-2 text-sm font-medium text-white transition " +
  "bg-red-600 hover:bg-red-700";

/** Provider konfirmasi custom (pengganti window.confirm bawaan browser). */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback((input: ConfirmOptions | string) => {
    const next = typeof input === "string" ? { message: input } : input;
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setOpts(next);
    });
  }, []);

  const close = useCallback((result: boolean) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setOpts(null);
  }, []);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {opts && (
        <ConfirmDialog
          opts={opts}
          onCancel={() => close(false)}
          onConfirm={() => close(true)}
        />
      )}
    </ConfirmContext.Provider>
  );
}

function ConfirmDialog({
  opts,
  onCancel,
  onConfirm,
}: {
  opts: ConfirmOptions;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const {
    title = "Konfirmasi",
    message,
    confirmText = "OK",
    cancelText = "Batal",
    danger = false,
  } = opts;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      else if (e.key === "Enter") onConfirm();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel, onConfirm]);

  return (
    <div
      className="fixed inset-0 z-[2147483600] flex items-center justify-center bg-jet-900/50 p-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:bg-night-900 dark:ring-1 dark:ring-night-700"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold text-navy dark:text-jet-100">
          {title}
        </h3>
        <div className="mt-2 space-y-1.5 text-sm text-slate-600 dark:text-brand-200/80">
          {message.split("\n").map((line, i) =>
            line ? (
              <p key={i} className="whitespace-pre-wrap break-words">
                {line}
              </p>
            ) : (
              <div key={i} className="h-2" />
            ),
          )}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className={CANCEL_BTN}>
            {cancelText}
          </button>
          <button
            type="button"
            autoFocus
            onClick={onConfirm}
            className={danger ? DANGER_BTN : PRIMARY_BTN}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Hook: kembalikan fungsi confirm async. Fallback ke window.confirm bila di luar provider. */
export function useConfirm(): ConfirmContextValue["confirm"] {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    return (input) =>
      Promise.resolve(
        window.confirm(typeof input === "string" ? input : input.message),
      );
  }
  return ctx.confirm;
}
