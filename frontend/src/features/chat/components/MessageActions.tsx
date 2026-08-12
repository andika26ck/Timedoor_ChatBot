import { CopyButton } from "../../../components/ui/CopyButton";
import { FeedbackButtons } from "../../../components/ui/FeedbackButtons";
import type { ChatMessage } from "../types";

interface MessageActionsProps {
  message: ChatMessage;
  onFeedback: (value: "up" | "down") => void;
  onRetry: () => void;
}

/** Baris aksi di bawah jawaban AI: Copy, Feedback, Retry. */
export function MessageActions({ message, onFeedback, onRetry }: MessageActionsProps) {
  return (
    <div className="mt-1 flex items-center gap-1">
      <CopyButton text={message.text} />
      <FeedbackButtons value={message.feedback} onChange={onFeedback} />
      <button
        type="button"
        onClick={onRetry}
        aria-label="Ulangi pertanyaan"
        title="Ulangi"
        className="rounded-md px-1.5 py-1 text-xs text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="23 4 23 10 17 10" />
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
        </svg>
      </button>
    </div>
  );
}
