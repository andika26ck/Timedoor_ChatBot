import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  askQuestionStream,
  getPopularQuestions,
  getTaxonomy,
  sendFeedback,
} from "../../../lib/api";
import type { ChatHistoryTurn } from "../../../lib/types";
import type { ChatMessage, Conversation, FeedbackValue } from "../types";
import { useLocalStorage } from "./useLocalStorage";

function jamSekarang(): string {
  return new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

const MAX_SUGGESTIONS = 3;
const DEFAULT_HISTORY_WINDOW = 6;
const DEFAULT_STORAGE_KEY = "cobee.conversations.v1";

export interface UseChatOptions {
  /** Simpan & kelola banyak percakapan di localStorage (sidebar Riwayat). */
  persist?: boolean;
  /** Kunci localStorage untuk daftar percakapan. */
  storageKey?: string;
  /** Kirim beberapa giliran terakhir ke backend agar bot mengingat konteks. */
  multiTurn?: boolean;
  /** Jumlah pesan terakhir yang dikirim sebagai konteks (default 6). */
  historyWindow?: number;
}

function judulDari(messages: ChatMessage[]): string {
  const firstUser = messages.find((m) => m.role === "user" && m.text.trim());
  const raw = firstUser?.text.trim();
  if (!raw) return "Percakapan baru";
  return raw.length > 48 ? `${raw.slice(0, 48)}\u2026` : raw;
}

function buatPercakapan(): Conversation {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    title: "Percakapan baru",
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Seluruh state & aksi percakapan chat, dipisah dari UI agar bisa dipakai
 * ulang di panel dashboard maupun di floating widget.
 *
 * Opsi:
 *  - persist  : aktifkan riwayat multi-percakapan tersimpan di localStorage.
 *  - multiTurn: kirim beberapa giliran terakhir ke backend (bot "mengingat").
 * Tanpa opsi, perilakunya sama persis seperti versi sebelumnya (dipakai widget).
 */
export function useChat(active: boolean, options: UseChatOptions = {}) {
  const {
    persist = false,
    storageKey = DEFAULT_STORAGE_KEY,
    multiTurn = false,
    historyWindow = DEFAULT_HISTORY_WINDOW,
  } = options;

  const [conversations, setConversations] = useLocalStorage<Conversation[]>(storageKey, []);
  const [activeId, setActiveId] = useState<string | null>(null);

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

  // Ref agar submitQuestion & aksi lain selalu membaca nilai terbaru tanpa
  // memaksa dependensi useCallback berubah tiap render.
  const messagesRef = useRef<ChatMessage[]>(messages);
  const conversationsRef = useRef<Conversation[]>(conversations);
  const activeIdRef = useRef<string | null>(activeId);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);
  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  // Inisialisasi percakapan aktif (sekali) saat mode persist aktif.
  const initedRef = useRef(false);
  useEffect(() => {
    if (!persist || initedRef.current) return;
    initedRef.current = true;
    if (conversations.length > 0) {
      const latest = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt)[0];
      setActiveId(latest.id);
      setMessages(latest.messages);
    } else {
      const conv = buatPercakapan();
      setConversations([conv]);
      setActiveId(conv.id);
      setMessages([]);
    }
  }, [persist, conversations, setConversations]);

  // Simpan balik pesan ke percakapan aktif (debounce ringan supaya streaming
  // tidak menulis localStorage tiap token).
  useEffect(() => {
    if (!persist || !activeId) return;
    const id = activeId;
    const snapshot = messages;
    const t = setTimeout(() => {
      setConversations((prev) => {
        let found = false;
        const next = prev.map((c) => {
          if (c.id !== id) return c;
          found = true;
          return {
            ...c,
            messages: snapshot,
            title: judulDari(snapshot),
            updatedAt: Date.now(),
          };
        });
        if (!found) {
          next.unshift({
            id,
            title: judulDari(snapshot),
            messages: snapshot,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        }
        return next;
      });
    }, 300);
    return () => clearTimeout(t);
  }, [messages, persist, activeId, setConversations]);

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
    setMessages([]);
    setError(null);
  }, []);

  // ------------------------- Aksi percakapan (persist) -------------------------
  const newConversation = useCallback(() => {
    abortRef.current?.abort();
    setError(null);
    setInput("");
    if (!persist) {
      setMessages([]);
      return;
    }
    const conv = buatPercakapan();
    setConversations((prev) => [conv, ...prev]);
    setActiveId(conv.id);
    setMessages([]);
  }, [persist, setConversations]);

  const selectConversation = useCallback(
    (id: string) => {
      if (!persist || id === activeIdRef.current) return;
      const conv = conversationsRef.current.find((c) => c.id === id);
      if (!conv) return;
      abortRef.current?.abort();
      setError(null);
      setInput("");
      setActiveId(id);
      setMessages(conv.messages);
    },
    [persist],
  );

  const renameConversation = useCallback(
    (id: string, title: string) => {
      const t = title.trim();
      if (!t) return;
      setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, title: t } : c)));
    },
    [setConversations],
  );

  const deleteConversation = useCallback(
    (id: string) => {
      const prev = conversationsRef.current;
      let next = prev.filter((c) => c.id !== id);
      if (activeIdRef.current === id) {
        abortRef.current?.abort();
        if (next.length === 0) {
          const conv = buatPercakapan();
          next = [conv];
          setActiveId(conv.id);
          setMessages([]);
        } else {
          const latest = [...next].sort((a, b) => b.updatedAt - a.updatedAt)[0];
          setActiveId(latest.id);
          setMessages(latest.messages);
        }
      }
      setConversations(next);
    },
    [setConversations],
  );

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
    // Riwayat percakapan (aktif hanya saat persist).
    persistEnabled: persist,
    conversations,
    activeId,
    newConversation,
    selectConversation,
    renameConversation,
    deleteConversation,
  };
}

export type UseChat = ReturnType<typeof useChat>;
