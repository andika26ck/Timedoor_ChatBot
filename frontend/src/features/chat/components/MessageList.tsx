import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { ErrorNotice } from "./ErrorNotice";
import { EmptyState } from "./EmptyState";
import { ScrollToBottomButton } from "./ScrollToBottomButton";
import { useAutoScroll } from "../hooks/useAutoScroll";
import type { ChatMessage } from "../types";

interface MessageListProps {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  suggestions: string[];
  onPickSuggestion: (text: string) => void;
  onRetryTopic: (topic: string, question: string) => void;
  onFeedback: (messageId: string, value: "up" | "down") => void;
  onRetry: (question?: string) => void;
}

export function MessageList({
  messages,
  loading,
  error,
  suggestions,
  onPickSuggestion,
  onRetryTopic,
  onFeedback,
  onRetry,
}: MessageListProps) {
  const { ref, showButton, scrollToBottom, onScroll } = useAutoScroll([messages, loading]);
  const empty = messages.length === 0 && !loading;

  return (
    <div className="relative min-h-0 flex-1">
      <div ref={ref} onScroll={onScroll} className="h-full overflow-y-auto">
        {empty ? (
          <EmptyState suggestions={suggestions} onPick={onPickSuggestion} />
        ) : (
          <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6">
            {messages.map((m, i) => {
              // Jangan render bubble assistant kosong saat menunggu chunk pertama.
              // Kalau dirender, muncul strip kursor "|" bareng TypingIndicator → 2 bubble proses.
              const waitingForFirstChunk =
                loading && m.role === "assistant" && i === messages.length - 1 && !m.text.trim();
              if (waitingForFirstChunk) return null;

              return (
                <MessageBubble
                  key={m.id}
                  message={m}
                  streaming={loading && m.role === "assistant" && i === messages.length - 1}
                  onRetryTopic={onRetryTopic}
                  onFeedback={onFeedback}
                  onRetry={onRetry}
                />
              );
            })}
            {loading && !messages[messages.length - 1]?.text?.trim() && <TypingIndicator />}
            {error && <ErrorNotice text={error} onRetry={() => onRetry()} />}
          </div>
        )}
      </div>
      <ScrollToBottomButton visible={showButton} onClick={() => scrollToBottom()} />
    </div>
  );
}
