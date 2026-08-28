import { Fragment, useEffect, useMemo, useState } from "react";
import {
  deleteChatSession,
  getChatSession,
  getChatSessions,
  type ChatLogMessage,
  type ChatSessionSummary,
} from "../lib/api";
import { useConfirm } from "./ui/Confirm";
import { Pagination } from "./ui/Pagination";

const CARD =
  "rounded-2xl border border-slate-200 bg-white dark:border-night-700 dark:bg-night-900";

const GHOST_BTN =
  "rounded-lg border px-2.5 py-1 text-xs transition " +
  "border-slate-200 text-jet-700 hover:bg-jet-100 " +
  "dark:border-night-600 dark:text-brand-100 dark:hover:bg-night-800";

const DANGER_BTN =
  "rounded-lg border px-2.5 py-1 text-xs transition " +
  "border-red-200 text-red-600 hover:bg-red-50 " +
  "dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10";

const PAGE_SIZE = 10;

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

/** Meta warna + label untuk badge asal percakapan. */
const CHANNEL_META: Record<string, { label: string; cls: string }> = {
  web: {
    label: "Web",
    cls: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
  },
  cms: {
    label: "CMS",
    cls: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300",
  },
};

/** Badge kecil penanda asal percakapan (Web / CMS / tak diketahui). */
function ChannelBadge({ channel }: { channel?: string }) {
  const meta = channel ? CHANNEL_META[channel] : undefined;
  if (!meta) {
    return (
      <span
        title="Asal tidak diketahui"
        className="inline-block rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 dark:border-night-600 dark:bg-night-800 dark:text-brand-200/60"
      >
        ?
      </span>
    );
  }
  return (
    <span
      className={`inline-block rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${meta.cls}`}
    >
      {meta.label}
    </span>
  );
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
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-jet-900/50 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full flex-col bg-white shadow-xl dark:bg-night-900 dark:ring-1 dark:ring-night-700 sm:h-auto sm:max-h-[85vh] sm:max-w-2xl sm:rounded-2xl"
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
            {(() => {
              const ch = messages.find((m) => m.channel)?.channel;
              return ch ? (
                <div className="mt-1">
                  <ChannelBadge channel={ch} />
                </div>
              ) : null;
            })()}
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

/** Satu akun (atau sesi anonim) hasil pengelompokan Riwayat. */
interface UserGroup {
  key: string;
  name: string;
  email?: string;
  anonymous: boolean;
  sessions: ChatSessionSummary[];
  questions: number;
  lastAt: string;
  channels: string[];
}

/** Kunci identitas sesi: utamakan user_id, lalu email, lalu nama. */
function identityKey(s: ChatSessionSummary): string | null {
  const id = (s.user_id || "").trim().toLowerCase();
  const email = (s.user_email || "").trim().toLowerCase();
  const name = (s.user_name || "").trim().toLowerCase();
  return id || email || name || null;
}

/** Gabungkan sesi menjadi kelompok per akun (sesi anonim tetap berdiri sendiri). */
function groupByUser(sessions: ChatSessionSummary[]): UserGroup[] {
  const map = new Map<string, UserGroup>();
  for (const s of sessions) {
    const idKey = identityKey(s);
    const anonymous = !idKey;
    const key = idKey ?? `anon:${s.session_id}`;
    let g = map.get(key);
    if (!g) {
      g = {
        key,
        name: s.user_name || s.user_email || "Anonim",
        email: s.user_name && s.user_email ? s.user_email : undefined,
        anonymous,
        sessions: [],
        questions: 0,
        lastAt: s.last_at,
        channels: [],
      };
      map.set(key, g);
    }
    g.sessions.push(s);
    g.questions += s.questions;
    if (!g.lastAt || (s.last_at && s.last_at > g.lastAt)) g.lastAt = s.last_at;
    const chs = s.channels?.length ? s.channels : s.channel ? [s.channel] : [];
    for (const c of chs) if (c && !g.channels.includes(c)) g.channels.push(c);
  }
  for (const g of map.values()) {
    g.sessions.sort((a, b) => (b.last_at || "").localeCompare(a.last_at || ""));
    const latest = g.sessions[0];
    if (latest && (latest.user_name || latest.user_email)) {
      g.name = latest.user_name || latest.user_email || g.name;
      g.email =
        latest.user_name && latest.user_email ? latest.user_email : undefined;
    }
  }
  return [...map.values()].sort((a, b) =>
    (b.lastAt || "").localeCompare(a.lastAt || ""),
  );
}

/**
 * Riwayat Pengguna (sisi admin): daftar percakapan dikelompokkan per akun.
 * Tiap akun bisa di-expand untuk melihat sesi-sesinya; klik "Lihat" untuk
 * membaca seluruh isi satu sesi. Percakapan otomatis terhapus setelah 60 hari.
 */
export function ChatLogsPanel() {
  const confirm = useConfirm();
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ChatLogMessage[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [channelFilter, setChannelFilter] = useState<string>("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [page, setPage] = useState(0);

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

  function toggle(key: string) {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  }

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

  async function removeSession(id: string) {
    if (
      !(await confirm({
        title: "Hapus percakapan",
        message:
          "Hapus permanen percakapan ini? Tindakan ini tidak bisa dibatalkan.",
        confirmText: "Hapus",
        danger: true,
      }))
    ) {
      return;
    }
    try {
      await deleteChatSession(id);
      setSessions((prev) => prev.filter((s) => s.session_id !== id));
      if (openId === id) setOpenId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menghapus percakapan.");
    }
  }

  async function removeGroup(g: UserGroup) {
    if (
      !(await confirm({
        title: "Hapus semua percakapan",
        message: `Hapus permanen SEMUA ${g.sessions.length} percakapan milik "${g.name}"? Tindakan ini tidak bisa dibatalkan.`,
        confirmText: "Hapus semua",
        danger: true,
      }))
    ) {
      return;
    }
    try {
      for (const s of g.sessions) {
        await deleteChatSession(s.session_id);
      }
      const ids = new Set(g.sessions.map((s) => s.session_id));
      setSessions((prev) => prev.filter((s) => !ids.has(s.session_id)));
      if (openId && ids.has(openId)) setOpenId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menghapus percakapan.");
    }
  }

  const filtered = useMemo(
    () =>
      channelFilter
        ? sessions.filter(
            (s) =>
              (s.channels?.includes(channelFilter) ?? false) ||
              (s.channel || "") === channelFilter,
          )
        : sessions,
    [sessions, channelFilter],
  );
  const groups = useMemo(() => groupByUser(filtered), [filtered]);
  const totalQuestions = filtered.reduce((n, s) => n + s.questions, 0);

  const totalPages = Math.max(1, Math.ceil(groups.length / PAGE_SIZE));
  const pagedGroups = useMemo(
    () => groups.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE),
    [groups, page],
  );
  // Jaga halaman tetap valid saat data menyusut (mis. setelah hapus / filter).
  useEffect(() => {
    if (page > 0 && page >= totalPages) setPage(totalPages - 1);
  }, [page, totalPages]);

  return (
    <div className="h-full overflow-y-auto bg-jet-100 dark:bg-night-950">
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-navy dark:text-jet-100">Riwayat Pengguna</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-brand-200/70">
              Percakapan dikelompokkan per akun (nama user bila login lewat CMS, atau
              “Anonim”). Klik satu baris untuk melihat semua sesinya, lalu “Lihat”
              untuk membaca isi percakapan. Percakapan otomatis terhapus permanen setelah 60 hari.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <select
              value={channelFilter}
              onChange={(e) => {
                setPage(0);
                setChannelFilter(e.target.value);
              }}
              title="Saring berdasarkan asal percakapan"
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-jet-700 dark:border-night-600 dark:bg-night-900 dark:text-brand-100"
            >
              <option value="">Semua asal</option>
              <option value="web">Web</option>
              <option value="cms">CMS</option>
            </select>
            <button type="button" onClick={() => void load()} className={GHOST_BTN}>
              Muat ulang
            </button>
          </div>
        </div>

        {!loading && !error && sessions.length > 0 && (
          <div className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-brand-200/70">
            <span className={`px-3 py-1 ${CARD}`}>
              Total pengguna: <b className="text-jet-700 dark:text-jet-100">{groups.length}</b>
            </span>
            <span className={`px-3 py-1 ${CARD}`}>
              Total sesi: <b className="text-jet-700 dark:text-jet-100">{filtered.length}</b>
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
            <>
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400 dark:border-night-700 dark:text-brand-200/60">
                  <tr>
                    <th className="px-4 py-3 font-medium">Pengguna</th>
                    <th className="px-4 py-3 font-medium">Pertanyaan terbaru</th>
                    <th className="px-4 py-3 text-center font-medium">Tanya</th>
                    <th className="px-4 py-3 font-medium">Terakhir aktif</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-night-800">
                  {pagedGroups.map((g) => {
                    const isOpen = !!expanded[g.key];
                    const latest = g.sessions[0];
                    return (
                      <Fragment key={g.key}>
                        <tr
                          className="cursor-pointer hover:bg-jet-50 dark:hover:bg-night-800/50"
                          onClick={() => toggle(g.key)}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-start gap-2">
                              <span
                                className={`mt-0.5 select-none text-xs text-slate-400 transition-transform ${isOpen ? "rotate-90" : ""}`}
                              >
                                ▶
                              </span>
                              <div className="min-w-0">
                                {g.anonymous ? (
                                  <div className="italic text-slate-400 dark:text-brand-200/60">Anonim</div>
                                ) : (
                                  <>
                                    <div className="truncate font-medium text-jet-700 dark:text-brand-100">
                                      {g.name}
                                    </div>
                                    {g.email && (
                                      <div className="truncate text-xs text-slate-400 dark:text-brand-200/60">
                                        {g.email}
                                      </div>
                                    )}
                                  </>
                                )}
                                <div className="mt-1 flex flex-wrap items-center gap-1">
                                  {g.channels.length ? (
                                    g.channels.map((c) => <ChannelBadge key={c} channel={c} />)
                                  ) : (
                                    <ChannelBadge />
                                  )}
                                  <span className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:border-night-600 dark:bg-night-800 dark:text-brand-200/70">
                                    {g.sessions.length} sesi
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="max-w-md px-4 py-3">
                            <span className="line-clamp-2 text-slate-500 dark:text-brand-200/70">
                              {latest?.first_question || "-"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center font-medium text-jet-700 dark:text-brand-100">
                            {g.questions}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-slate-500 dark:text-brand-200/70">
                            {fmt(g.lastAt)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggle(g.key);
                                }}
                                className={GHOST_BTN}
                              >
                                {isOpen ? "Tutup" : `Lihat ${g.sessions.length} sesi`}
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void removeGroup(g);
                                }}
                                className={DANGER_BTN}
                              >
                                Hapus semua
                              </button>
                            </div>
                          </td>
                        </tr>
                        {isOpen &&
                          g.sessions.map((s) => (
                            <tr
                              key={s.session_id}
                              className="bg-jet-50/60 dark:bg-night-800/30"
                            >
                              <td className="px-4 py-2 pl-10">
                                <div className="min-w-0">
                                  <div className="font-mono text-[10px] text-slate-400 dark:text-brand-200/50">
                                    {shortId(s.session_id)}
                                  </div>
                                  <div className="mt-1">
                                    <ChannelBadge channel={s.channel} />
                                  </div>
                                </div>
                              </td>
                              <td className="max-w-md px-4 py-2">
                                <span className="line-clamp-2 text-jet-700 dark:text-brand-100">
                                  {s.first_question || "-"}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-center text-jet-700 dark:text-brand-100">
                                {s.questions}
                              </td>
                              <td className="whitespace-nowrap px-4 py-2 text-slate-500 dark:text-brand-200/70">
                                {fmt(s.last_at)}
                              </td>
                              <td className="px-4 py-2 text-right">
                                <div className="flex justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => void openSession(s.session_id)}
                                    className={GHOST_BTN}
                                  >
                                    Lihat
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void removeSession(s.session_id)}
                                    className={DANGER_BTN}
                                  >
                                    Hapus
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-slate-100 sm:hidden dark:divide-night-800">
              {pagedGroups.map((g) => {
                const isOpen = !!expanded[g.key];
                return (
                  <li key={g.key} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => toggle(g.key)}
                        className="flex min-w-0 items-start gap-2 text-left"
                      >
                        <span
                          className={`mt-0.5 select-none text-xs text-slate-400 ${isOpen ? "rotate-90" : ""}`}
                        >
                          ▶
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-jet-700 dark:text-brand-100">
                            {g.anonymous ? "Anonim" : g.name}
                          </span>
                          {!g.anonymous && g.email && (
                            <span className="block truncate text-xs text-slate-400 dark:text-brand-200/60">
                              {g.email}
                            </span>
                          )}
                          <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400 dark:text-brand-200/60">
                            {g.channels.length ? (
                              g.channels.map((c) => <ChannelBadge key={c} channel={c} />)
                            ) : (
                              <ChannelBadge />
                            )}
                            <span>· {g.sessions.length} sesi</span>
                            <span>· {g.questions} tanya</span>
                            <span>· {fmt(g.lastAt)}</span>
                          </span>
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => void removeGroup(g)}
                        className={DANGER_BTN}
                      >
                        Hapus
                      </button>
                    </div>
                    {isOpen && (
                      <ul className="mt-2 space-y-2 border-l border-slate-200 pl-3 dark:border-night-700">
                        {g.sessions.map((s) => (
                          <li key={s.session_id} className="space-y-1">
                            <div className="flex items-start justify-between gap-3">
                              <span className="line-clamp-2 text-sm text-jet-700 dark:text-brand-100">
                                {s.first_question || "-"}
                              </span>
                              <div className="flex shrink-0 gap-2">
                                <button
                                  type="button"
                                  onClick={() => void openSession(s.session_id)}
                                  className={GHOST_BTN}
                                >
                                  Lihat
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void removeSession(s.session_id)}
                                  className={DANGER_BTN}
                                >
                                  Hapus
                                </button>
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 dark:text-brand-200/60">
                              <ChannelBadge channel={s.channel} />
                              <span className="font-mono">· {shortId(s.session_id)}</span>
                              <span>· {s.questions} tanya</span>
                              <span>· {fmt(s.last_at)}</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
            </>
          )}
        </div>

        <Pagination
          page={page}
          totalPages={totalPages}
          onPage={setPage}
          loading={loading}
        />
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
