import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  askQuestionStream,
  getPopularQuestions,
  getTaxonomy,
  sendFeedback,
} from "../../../lib/api";
import type { ChatHistoryTurn } from "../../../lib/types";
import type { ChatMessage, FeedbackValue } from "../types";

function jamSekarang(): string {
  return new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

const MAX_SUGGESTIONS = 3;
const DEFAULT_HISTORY_WINDOW = 6;

export interface UseChatOptions {
  /** Kirim beberapa giliran terakhir ke backend agar bot mengingat konteks. */
  multiTurn?: boolean;
  /** Jumlah pesan terakhir yang dikirim sebagai konteks (default 6). */
  historyWindow?: number;
}

/**
 * Seluruh state & aksi percakapan chat, dipisah dari UI agar bisa dipakai ulang
 * di halaman end-user, panel dashboard admin, maupun floating widget.
 *
 * multiTurn = true membuat beberapa giliran terakhir dikirim ke backend supaya
 * bot "mengingat" konteks. Tanpa opsi, perilakunya sama seperti versi awal.
 *
 * Catatan: session_id (untuk tracking sisi admin) ditangani otomatis di lib/api
 * dan tidak perlu diurus di sini.
 */
export function useChat(active: boolean, options: UseChatOptions = {}) {
  const { multiTurn = false, historyWindow = DEFAULT_HISTORY_WINDOW } = options;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const [domains, setDomains] = useState<string[]>([]);
  const [domain, setDomain] = useState("");
  const [topicsByDomain, setTopicsByDomain] = useState<Record<string, string[]>>({});
  const [topic, setTopic] = useState("");

  const abortRef = useRef<AbortController | null>(null);

  // Ref agar submitQuestion & aksi lain selalu membaca pesan terbaru tanpa
  // memaksa dependensi useCallback berubah tiap render.
  const messagesRef = useRef<ChatMessage[]>(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Taksonomi: domain + peta topik per domain.
  useEffect(() => {
    getTaxonomy()
      .then((t) => {
        setDomains(t.domains ?? []);
        const map = t.topics_by_domain ?? {};
        if (Object.keys(map).length > 0) setTopicsByDomain(map);
        else if ((t.topics ?? []).length > 0) setTopicsByDomain({ "Semua domain": t.topics });
        else setTopicsByDomain({});
      })
      .catch(() => {
        setDomains([]);
        setTopicsByDomain({});
      });
  }, []);

  const allowedTopics = useMemo(() => {
    if (!domain) return null;
    const list = topicsByDomain[domain];
    return list && list.length > 0 ? new Set(list) : null;
  }, [domain, topicsByDomain]);

  useEffect(() => {
    if (topic && allowedTopics && !allowedTopics.has(topic)) setTopic("");
  }, [allowedTopics, topic]);

  const refreshSuggestions = useCallback(async () => {
    try {
      const popular = await getPopularQuestions(MAX_SUGGESTIONS).catch(() => []);
      const seen = new Set<string>();
      const out: string[] = [];
      for (const p of popular) {
        const key = p.question.trim();
        if (key && !seen.has(key)) {
          seen.add(key);
          out.push(key);
        }
      }
      setSuggestions(out.slice(0, MAX_SUGGESTIONS));
    } catch {
      /* biarkan kosong */
    }
  }, []);

  useEffect(() => {
    if (active) refreshSuggestions();
  }, [active, refreshSuggestions]);

  const patchMsg = useCallback((id: string, change: Partial<ChatMessage>) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...change } : m)));
  }, []);

  const submitQuestion = useCallback(
    async (raw: string, topicOverride?: string) => {
      const trimmed = raw.trim();
      if (!trimmed || loading) return;
      const useTopic = topicOverride ?? topic;

      setError(null);

      // Konteks multi-turn: pesan SEBELUM pertanyaan ini (dibatasi jendela).
      const history: ChatHistoryTurn[] = multiTurn
        ? messagesRef.current
            .filter((m) => m.text.trim())
            .slice(-historyWindow)
            .map((m) => ({ role: m.role, text: m.text }))
        : [];

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        text: trimmed,
        time: jamSekarang(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setLoading(true);

      const botId = crypto.randomUUID();
      setMessages((prev) => [
        ...prev,
        {
          id: botId,
          role: "assistant",
          text: "",
          time: jamSekarang(),
          askedText: trimmed,
          feedback: null,
        },
      ]);

      const controller = new AbortController();
      abortRef.current = controller;

      let answer = "";
      try {
        await askQuestionStream(
          trimmed,
          domain || undefined,
          useTopic || undefined,
          history,
          {
            onText: (chunk) => {
              answer += chunk;
              patchMsg(botId, { text: answer });
            },
            onCitations: (citations) => patchMsg(botId, { citations }),
            onRelated: (related) => patchMsg(botId, { related }),
            onTopicHint: (topicHint) => patchMsg(botId, { topicHint }),
          },
          controller.signal,
        );
        if (!answer.trim()) patchMsg(botId, { text: "(Jawaban kosong.)" });
        refreshSuggestions();
      } catch (e) {
        if (controller.signal.aborted) {
          if (!answer.trim()) setMessages((prev) => prev.filter((m) => m.id !== botId));
        } else {
          setError(e instanceof Error ? e.message : "Terjadi kesalahan tak terduga.");
          if (!answer.trim()) setMessages((prev) => prev.filter((m) => m.id !== botId));
        }
      } finally {
        setLoading(false);
        abortRef.current = null;
      }
    },
    [loading, topic, domain, patchMsg, refreshSuggestions, multiTurn, historyWindow],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const retryWithTopic = useCallback(
    (nextTopic: string, question: string) => {
      if (!question.trim() || loading) return;
      setTopic(nextTopic);
      submitQuestion(question, nextTopic);
    },
    [loading, submitQuestion],
  );

  const retry = useCallback(
    (question?: string) => {
      const q =
        question ?? [...messagesRef.current].reverse().find((m) => m.role === "user")?.text;
      if (q) submitQuestion(q);
    },
    [submitQuestion],
  );

  const giveFeedback = useCallback(
    (messageId: string, value: FeedbackValue) => {
      patchMsg(messageId, { feedback: value });
      const msg = messagesRef.current.find((m) => m.id === messageId);
      if (value) sendFeedback({ messageId, value, question: msg?.askedText, answer: msg?.text });
    },
    [patchMsg],
  );

  const clear = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setInput("");
    setError(null);
  }, []);

  return {
    messages,
    input,
    setInput,
    loading,
    error,
    suggestions,
    domains,
    domain,
    setDomain,
    topicsByDomain,
    topic,
    setTopic,
    submitQuestion,
    retryWithTopic,
    retry,
    stop,
    giveFeedback,
    clear,
  };
}

export type UseChat = ReturnType<typeof useChat>;
