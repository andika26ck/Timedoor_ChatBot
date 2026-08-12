import { MarkdownRenderer } from "../../../components/ui/MarkdownRenderer";
import { CitationCard } from "./CitationCard";
import { RelatedDocs } from "./RelatedDocs";
import { TopicHintCard } from "./TopicHintCard";
import { MessageActions } from "./MessageActions";
import type { ChatMessage } from "../types";

interface MessageBubbleProps {
  message: ChatMessage;
  streaming?: boolean;
  onRetryTopic: (topic: string, question: string) => void;
  onFeedback: (messageId: string, value: "up" | "down") => void;
  onRetry: (question?: string) => void;
}

/** Satu gelembung pesan (user atau AI) beserta sitasi & aksi. */
export function MessageBubble({
  message,
  streaming,
  onRetryTopic,
  onFeedback,
  onRetry,
}: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className="max-w-[85%]">
        <div
          className={
            "rounded-2xl px-4 py-2.5 text-sm " +
            (isUser
              ? "whitespace-pre-wrap rounded-br-sm bg-brand-600 text-white dark:bg-brand-700"
              : "rounded-bl-sm border border-slate-200 bg-white text-jet-700 " +
                "dark:border-night-700 dark:bg-night-900 dark:text-jet-100")
          }
        >
          {isUser ? (
            message.text
          ) : (
            <>
              <MarkdownRenderer content={message.text} />
              {streaming && (
                <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-brand-600 align-middle dark:bg-brand-400" />
              )}
            </>
          )}
        </div>

        {!isUser && <CitationCard citations={message.citations ?? []} />}

        {!isUser && message.topicHint && (
          <TopicHintCard
            hint={message.topicHint}
            askedText={message.askedText}
            onRetryTopic={onRetryTopic}
          />
        )}

        {!isUser && <RelatedDocs related={message.related ?? []} />}

        {!isUser && !streaming && message.text.trim() && (
          <MessageActions
            message={message}
            onFeedback={(v) => onFeedback(message.id, v)}
            onRetry={() => onRetry(message.askedText)}
          />
        )}

        <div
          className={
            `mt-1 text-[11px] ${isUser ? "text-right" : "text-left"} ` +
            "text-slate-400 dark:text-brand-200/60"
          }
        >
          {message.time}
        </div>
      </div>
    </div>
  );
}
