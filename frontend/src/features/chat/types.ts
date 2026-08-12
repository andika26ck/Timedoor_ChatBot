import type { Citation, RelatedDoc, TopicHint } from "../../lib/types";

export type FeedbackValue = "up" | "down" | null;

/** Satu pesan dalam percakapan chat. */
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  time: string;
  citations?: Citation[];
  related?: RelatedDoc[];
  topicHint?: TopicHint | null;
  /** Teks pertanyaan yang memicu jawaban ini (untuk retry). */
  askedText?: string;
  feedback?: FeedbackValue;
}
