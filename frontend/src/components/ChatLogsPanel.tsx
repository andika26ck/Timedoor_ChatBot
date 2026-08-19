import { useEffect, useState } from "react";
import {
  getChatSession,
  getChatSessions,
  type ChatLogMessage,
  type ChatSessionSummary,
} from "../lib/api";

const CARD =
  "rounded-2xl border border-slate-200 bg-white dark:border-night-700 dark:bg-night-900";

const GHOST_BTN =
  "rounded-lg border px-2.5 py-1 text-xs transition " +
  "border-slate-200 text-jet-700 hover:bg-jet-100 " +
  "dark:border-night-600 dark:text-brand-100 dark:hover:bg-night-800";

function fmt(iso: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

function shortId(id: string): string {
  if (!id) return "-";
  return id.length <= 12 ? id : `${id.slice(0, 8)}\u2026`;
}

/** Modal detail: menampilkan seluruh percakapan dalam satu sesi. */
function SessionModal({
  sessionId,
  messages,
  loading,
  onClose,
}: {
  sessionId: string;
  messages: ChatLogMessage[];
  loading: boolean;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-jet-900/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-xl dark:bg-night-900 dark:ring-1 dark:ring-night-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-night-700">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-navy dark:text-jet-100">
              Detail sesi
            </h3>
            <p className="truncate font-mono text-xs text-slate-400 dark:text-brand-200/60">
              {sessionId}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-slate-400 transition hover:bg-jet-100 hover:text-jet-700 dark:text-brand-200/60 dark:hover:bg-night-800 dark:hover:text-brand-100"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {loading ? (
            <p className="text-sm text-slate-500 dark:text-brand-200/70">Memuat percakapan...</p>
          ) : messages.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-brand-200/70">
              Tidak ada pesan pada sesi ini.
            </p>
          ) : (
            messages.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === "user"
                    ? "ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-brand-600 px-3 py-2 text-sm text-white"
                    : "mr-auto max-w-[85%] rounded-2xl rounded-bl-sm border border-slate-200 bg-jet-50 px-3 py-2 text-sm text-jet-700 dark:border-night-700 dark:bg-night-800 dark:text-brand-100"
                }
              >
                <div className="whitespace-pre-wrap break-words">{m.text}</div>
                <div
                  className={
                    "mt-1 text-[10px] " +
                    (m.role === "user" ? "text-white/70" : "text-slate-400 dark:text-brand-200/50")
                  }
                >
                  {m.role === "user" ? "Pengguna" : "Cobee"} · {fmt(m.created_at)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Riwayat Pengguna (sisi admin): daftar sesi anonim yang memakai chatbot,
 * lengkap dengan kapan terakhir aktif, berapa kali bertanya, dan pertanyaan
 * pertamanya. Klik "Lihat" untuk membaca seluruh percakapan sesi tersebut.
 */
export function ChatLogsPanel() {
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ChatLogMessage[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setSessions(await getChatSessions({ limit: 200 }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat riwayat.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function openSession(id: string) {
    setOpenId(id);
    setDetail([]);
    setDetailLoading(true);
    try {
      setDetail(await getChatSession(id));
    } catch {
      setDetail([]);
    } finally {
      setDetailLoading(false);
    }
  }

  const totalQuestions = sessions.reduce((n, s) => n + s.questions, 0);

  return (
    <div className="h-full overflow-y-auto bg-jet-100 dark:bg-night-950">
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-navy dark:text-jet-100">Riwayat Pengguna</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-brand-200/70">
              Pantau siapa saja (per sesi anonim) yang memakai chatbot: kapan terakhir aktif dan apa
              yang ditanyakan. Klik “Lihat” untuk membaca seluruh percakapan.
            </p>
          </div>
          <button type="button" onClick={() => void load()} className={GHOST_BTN}>
            Muat ulang
          </button>
        </div>

        {!loading && !error && sessions.length > 0 && (
          <div className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-brand-200/70">
            <span className={`px-3 py-1 ${CARD}`}>
              Total sesi: <b className="text-jet-700 dark:text-jet-100">{sessions.length}</b>
            </span>
            <span className={`px-3 py-1 ${CARD}`}>
              Total pertanyaan: <b className="text-jet-700 dark:text-jet-100">{totalQuestions}</b>
            </span>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        )}

        <div className={`overflow-hidden ${CARD}`}>
          {loading ? (
            <p className="px-5 py-6 text-sm text-slate-500 dark:text-brand-200/70">Memuat...</p>
          ) : sessions.length === 0 ? (
            <p className="px-5 py-6 text-sm text-slate-500 dark:text-brand-200/70">
              Belum ada percakapan tercatat. Coba ajukan pertanyaan lewat halaman chat end-user.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400 dark:border-night-700 dark:text-brand-200/60">
                  <tr>
                    <th className="px-4 py-3 font-medium">Sesi</th>
                    <th className="px-4 py-3 font-medium">Pertanyaan pertama</th>
                    <th className="px-4 py-3 text-center font-medium">Tanya</th>
                    <th className="px-4 py-3 font-medium">Terakhir aktif</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-night-800">
                  {sessions.map((s) => (
                    <tr key={s.session_id} className="hover:bg-jet-50 dark:hover:bg-night-800/50">
                      <td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-brand-200/70">
                        {shortId(s.session_id)}
                      </td>
                      <td className="max-w-md px-4 py-3">
                        <span className="line-clamp-2 text-jet-700 dark:text-brand-100">
                          {s.first_question || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-jet-700 dark:text-brand-100">
                        {s.questions}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-500 dark:text-brand-200/70">
                        {fmt(s.last_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => void openSession(s.session_id)}
                          className={GHOST_BTN}
                        >
                          Lihat
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {openId && (
        <SessionModal
          sessionId={openId}
          messages={detail}
          loading={detailLoading}
          onClose={() => setOpenId(null)}
        />
      )}
    </div>
  );
}
