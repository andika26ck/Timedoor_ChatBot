import { useChat } from "../hooks/useChat";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
import { DomainTopicFilter } from "./DomainTopicFilter";

interface ChatPanelProps {
  active: boolean;
  /** Sembunyikan filter domain/topik (mis. untuk widget yang ringkas). */
  showFilter?: boolean;
}

/**
 * Panel chat lengkap yang bisa dipakai ulang di dashboard maupun widget.
 * Semua logika ada di hook useChat.
 */
export function ChatPanel({ active, showFilter = true }: ChatPanelProps) {
  const chat = useChat(active);

  return (
    <div className="flex h-full flex-col bg-jet-100 dark:bg-night-950">
      <MessageList
        messages={chat.messages}
        loading={chat.loading}
        error={chat.error}
        suggestions={chat.suggestions}
        onPickSuggestion={chat.submitQuestion}
        onRetryTopic={chat.retryWithTopic}
        onFeedback={chat.giveFeedback}
        onRetry={chat.retry}
      />

      <div className="border-t border-slate-200 bg-white/70 px-4 py-3 backdrop-blur dark:border-night-700 dark:bg-night-900/80">
        {showFilter && (
          <div className="mx-auto max-w-3xl">
            <DomainTopicFilter
              domains={chat.domains}
              topicsByDomain={chat.topicsByDomain}
              domain={chat.domain}
              topic={chat.topic}
              onDomainChange={chat.setDomain}
              onTopicChange={chat.setTopic}
            />
          </div>
        )}
        <ChatInput
          value={chat.input}
          onChange={chat.setInput}
          onSubmit={() => chat.submitQuestion(chat.input)}
          onStop={chat.stop}
          loading={chat.loading}
        />
      </div>
    </div>
  );
}
