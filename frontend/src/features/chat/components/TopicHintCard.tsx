import type { TopicHint } from "../../../lib/types";

interface TopicHintCardProps {
  hint: TopicHint;
  askedText?: string;
  onRetryTopic: (topic: string, question: string) => void;
}

/** Kartu saran topik saat backend mendeteksi mismatch; klik chip = retry. */
export function TopicHintCard({ hint, askedText, onRetryTopic }: TopicHintCardProps) {
  if (!hint || hint.suggested_topics.length === 0) return null;
  return (
    <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200">
      <p>
        Pertanyaan ini sepertinya bukan topik{" "}
        <span className="font-semibold">{hint.selected_topic || "yang dipilih"}</span>. Coba topik
        yang lebih sesuai:
      </p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {hint.suggested_topics.map((s, i) => (
          <button
            key={i}
            type="button"
            disabled={!askedText}
            onClick={() => onRetryTopic(s.topic, askedText ?? "")}
            title={s.source ? `Ada di ${s.source}` : undefined}
            className="rounded-full border border-amber-300 bg-white px-2 py-0.5 font-medium text-amber-800 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-amber-700 dark:bg-slate-900 dark:text-amber-200 dark:hover:bg-slate-800"
          >
            {s.topic}
            {s.domain && <span className="ml-1 text-amber-500">· {s.domain}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
