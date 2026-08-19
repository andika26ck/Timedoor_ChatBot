import { useEffect, useRef } from "react";

interface ChatInputProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onStop?: () => void;
  loading: boolean;
}

/** Textarea auto-grow + tombol kirim/stop. Enter kirim, Shift+Enter baris baru. */
export function ChatInput({ value, onChange, onSubmit, onStop, loading }: ChatInputProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  // Auto-grow tinggi textarea mengikuti isi (maks ~5 baris).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 140) + "px";
  }, [value]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="mx-auto flex max-w-3xl items-end gap-2"
    >
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={1}
        placeholder="Tulis pertanyaan... (Enter kirim, Shift+Enter baris baru)"
        className="flex-1 resize-none rounded-xl border border-slate-200 px-3.5 py-2.5 text-base focus:border-brand-400 sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-brand-900"
      />
      {loading && onStop ? (
        <button
          type="button"
          onClick={onStop}
          className="rounded-xl bg-slate-200 px-3 py-2.5 text-sm font-medium text-slate-700 sm:px-4 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
        >
          Stop
        </button>
      ) : (
        <button
          type="submit"
          disabled={loading || !value.trim()}
          className="rounded-xl bg-brand-600 px-3 py-2.5 text-sm font-medium text-white sm:px-4 hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Kirim
        </button>
      )}
    </form>
  );
}
