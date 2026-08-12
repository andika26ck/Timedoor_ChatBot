import { useToast } from "./Toast";

type Feedback = "up" | "down" | null | undefined;

interface FeedbackButtonsProps {
  value: Feedback;
  onChange: (v: "up" | "down") => void;
}

/** Tombol umpan balik 👍 / 👎 per jawaban. */
export function FeedbackButtons({ value, onChange }: FeedbackButtonsProps) {
  const { toast } = useToast();

  function pick(v: "up" | "down") {
    onChange(v);
    toast(v === "up" ? "Terima kasih atas masukannya!" : "Masukan tercatat", "success");
  }

  return (
    <div className="inline-flex items-center gap-0.5">
      <button
        type="button"
        onClick={() => pick("up")}
        aria-label="Jawaban membantu"
        title="Membantu"
        className={
          "rounded-md px-1.5 py-1 text-xs transition hover:bg-slate-100 dark:hover:bg-slate-800 " +
          (value === "up"
            ? "text-emerald-600"
            : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300")
        }
      >
        <ThumbIcon up filled={value === "up"} />
      </button>
      <button
        type="button"
        onClick={() => pick("down")}
        aria-label="Jawaban kurang membantu"
        title="Kurang membantu"
        className={
          "rounded-md px-1.5 py-1 text-xs transition hover:bg-slate-100 dark:hover:bg-slate-800 " +
          (value === "down"
            ? "text-red-500"
            : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300")
        }
      >
        <ThumbIcon filled={value === "down"} />
      </button>
    </div>
  );
}

function ThumbIcon({ up = false, filled = false }: { up?: boolean; filled?: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={up ? undefined : { transform: "rotate(180deg)" }}
    >
      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
    </svg>
  );
}
