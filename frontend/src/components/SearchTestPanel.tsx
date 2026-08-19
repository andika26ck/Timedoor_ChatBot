import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  debugSearch,
  getTaxonomy,
  type SearchDebugResult,
  type SearchHit,
  type Taxonomy,
} from "../lib/api";
import { DomainTopicFilter } from "../features/chat/components/DomainTopicFilter";

const CARD =
  "rounded-2xl border border-slate-200 bg-white dark:border-night-700 dark:bg-night-900";

/** Pilihan Top-K yang boleh diminta admin (backend membatasi maksimal 50). */
const TOP_K_OPTIONS = [3, 5, 8, 10, 15, 20];

/** Ambang batas snippet sebelum dilipat dengan tombol "Lihat selengkapnya". */
const SNIPPET_LIMIT = 320;

/** Warna & label kualitas berdasarkan skor kemiripan (kosinus). */
function scoreTone(score: number): { bar: string; text: string; label: string } {
  if (score >= 0.7)
    return {
      bar: "bg-emerald-500",
      text: "text-emerald-600 dark:text-emerald-400",
      label: "kuat",
    };
  if (score >= 0.5)
    return {
      bar: "bg-amber-500",
      text: "text-amber-600 dark:text-amber-400",
      label: "sedang",
    };
  return {
    bar: "bg-rose-500",
    text: "text-rose-600 dark:text-rose-400",
    label: "lemah",
  };
}

/** Skor -> lebar bar / persentase (dijepit 0..100%). */
function pct(score: number): string {
  const v = Math.max(0, Math.min(100, score * 100));
  return `${v.toFixed(1)}%`;
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-md bg-jet-100 px-1.5 py-0.5 text-slate-500 dark:bg-night-800 dark:text-brand-200/70">
      {children}
    </span>
  );
}

/** Satu kartu chunk: peringkat + skor (bar visual) + metadata + cuplikan teks. */
function HitCard({ hit }: { hit: SearchHit }) {
  const [open, setOpen] = useState(false);
  const tone = scoreTone(hit.score);
  const long = hit.text.length > SNIPPET_LIMIT;
  const shown = open || !long ? hit.text : `${hit.text.slice(0, SNIPPET_LIMIT)}\u2026`;

  return (
    <div className={`${CARD} p-4`}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
          {hit.rank}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="truncate font-medium text-jet-700 dark:text-brand-100">{hit.source}</span>
            {hit.chunk_index !== null && (
              <span className="text-xs text-slate-400 dark:text-brand-200/60">
                · chunk #{hit.chunk_index}
              </span>
            )}
          </div>

          {/* Skor + bar visual */}
          <div className="mt-2 flex items-center gap-2">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-night-800">
              <div className={`h-full rounded-full ${tone.bar}`} style={{ width: pct(hit.score) }} />
            </div>
            <span className={`shrink-0 text-xs font-semibold tabular-nums ${tone.text}`}>{pct(hit.score)}</span>
            <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:bg-night-800 dark:text-brand-200/70">
              {tone.label}
            </span>
          </div>

          {/* Metadata */}
          <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
            {hit.domain && <Chip>{hit.domain}</Chip>}
            {hit.category && <Chip>{hit.category}</Chip>}
            {hit.topics.map((t) => (
              <Chip key={t}>#{t}</Chip>
            ))}
            {typeof hit.approx_tokens === "number" && <Chip>~{hit.approx_tokens} token</Chip>}
            <Chip>{hit.char_count} char</Chip>
            <Chip>skor {hit.score.toFixed(4)}</Chip>
          </div>

          {/* Cuplikan isi chunk */}
          <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-600 dark:text-brand-200/80">
            {shown}
          </p>
          {long && (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="mt-1 text-xs font-medium text-brand-600 hover:underline dark:text-brand-300"
            >
              {open ? "Sembunyikan" : "Lihat selengkapnya"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Panel "Uji Pencarian" (sisi admin).
 *
 * Menguji tahap RETRIEVAL saja \u2014 tanpa memanggil jawaban LLM. Admin mengetik
 * pertanyaan, opsional membatasi domain/topik & Top-K, lalu melihat chunk mana
 * yang terambil beserta skor kemiripannya (divisualisasikan sebagai bar).
 * Berguna untuk men-debug kualitas knowledge base sebelum jawaban dibuat.
 */
export function SearchTestPanel() {
  const [taxonomy, setTaxonomy] = useState<Taxonomy | null>(null);
  const [question, setQuestion] = useState("");
  const [domain, setDomain] = useState("");
  const [topic, setTopic] = useState("");
  const [topK, setTopK] = useState(5);

  const [result, setResult] = useState<SearchDebugResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getTaxonomy()
      .then(setTaxonomy)
      .catch(() => setTaxonomy(null));
  }, []);

  // Reset topik ketika domain berganti supaya tidak menyisakan topik lintas-domain.
  useEffect(() => {
    setTopic("");
  }, [domain]);

  async function run() {
    const q = question.trim();
    if (!q || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await debugSearch({
        question: q,
        domain: domain || undefined,
        topic: topic || undefined,
        topK,
      });
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menjalankan uji pencarian.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  const avg = useMemo(() => {
    if (!result || result.results.length === 0) return null;
    return result.results.reduce((n, h) => n + h.score, 0) / result.results.length;
  }, [result]);

  const hasWarning =
    !!result &&
    (result.rewritten || result.filters.domain_fallback || result.filters.topic_fallback);

  return (
    <div className="h-full overflow-y-auto bg-jet-100 dark:bg-night-950">
      <div className="mx-auto max-w-4xl space-y-4 px-6 py-8">
        {/* Header */}
        <div>
          <h2 className="text-base font-semibold text-navy dark:text-jet-100">Uji Pencarian</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-brand-200/70">
            Uji tahap <b>retrieval</b> saja (tanpa jawaban LLM): lihat chunk mana yang terambil untuk
            sebuah pertanyaan, skor kemiripannya, dan pengaruh filter domain/topik. Berguna untuk
            men-debug kualitas knowledge base.
          </p>
        </div>

        {/* Form */}
        <div className={`${CARD} space-y-3 p-4`}>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                void run();
              }
            }}
            rows={2}
            placeholder='Ketik pertanyaan untuk diuji, mis. "Bagaimana cara Set to Paid invoice?" (Ctrl/Cmd+Enter untuk menjalankan)'
            className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-jet-700 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none dark:border-night-600 dark:bg-night-900 dark:text-brand-100 dark:placeholder:text-brand-200/40"
          />

          {taxonomy && (
            <DomainTopicFilter
              domains={taxonomy.domains}
              topicsByDomain={taxonomy.topics_by_domain ?? {}}
              domain={domain}
              topic={topic}
              onDomainChange={setDomain}
              onTopicChange={setTopic}
            />
          )}

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-brand-200/70">
              Top-K:
              <select
                value={topK}
                onChange={(e) => setTopK(Number(e.target.value))}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-jet-700 focus:border-brand-400 focus:outline-none dark:border-night-600 dark:bg-night-900 dark:text-brand-100"
              >
                {TOP_K_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n} chunk
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={() => void run()}
              disabled={loading || !question.trim()}
              className="ml-auto rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Mencari\u2026" : "Uji Pencarian"}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Ringkasan + hasil */}
        {result && (
          <>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-brand-200/70">
              <span className={`px-3 py-1 ${CARD}`}>
                Chunk ditampilkan: <b className="text-jet-700 dark:text-jet-100">{result.returned}</b>
              </span>
              <span className={`px-3 py-1 ${CARD}`}>
                Kandidat: <b className="text-jet-700 dark:text-jet-100">{result.candidates}</b>
              </span>
              <span className={`px-3 py-1 ${CARD}`}>
                Top-K: <b className="text-jet-700 dark:text-jet-100">{result.top_k}</b>
              </span>
              {avg !== null && (
                <span className={`px-3 py-1 ${CARD}`}>
                  Skor rata-rata: <b className="text-jet-700 dark:text-jet-100">{pct(avg)}</b>
                </span>
              )}
            </div>

            {hasWarning && (
              <div className="space-y-1 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                {result.rewritten && (
                  <p>
                    Pertanyaan ditulis ulang untuk pencarian: “<b>{result.search_query}</b>”.
                  </p>
                )}
                {result.filters.domain_fallback && (
                  <p>
                    Filter domain “{result.filters.domain}” tidak menghasilkan chunk — ditampilkan
                    tanpa filter domain (fallback).
                  </p>
                )}
                {result.filters.topic_fallback && (
                  <p>
                    Filter topik “{result.filters.topic}” tidak menghasilkan chunk — ditampilkan
                    tanpa filter topik (fallback).
                  </p>
                )}
              </div>
            )}

            {result.results.length === 0 ? (
              <div className={`${CARD} px-5 py-6 text-sm text-slate-500 dark:text-brand-200/70`}>
                Tidak ada chunk yang terambil. Pastikan knowledge base sudah berisi dokumen ter-index.
              </div>
            ) : (
              <div className="space-y-3">
                {result.results.map((h) => (
                  <HitCard key={h.id || `${h.doc_id}-${h.rank}`} hit={h} />
                ))}
              </div>
            )}
          </>
        )}

        {/* Empty state awal */}
        {!result && !error && !loading && (
          <div className={`${CARD} px-5 py-10 text-center text-sm text-slate-500 dark:text-brand-200/70`}>
            Ketik sebuah pertanyaan lalu tekan <b>Uji Pencarian</b> untuk melihat chunk & skor yang
            terambil dari knowledge base.
          </div>
        )}
      </div>
    </div>
  );
}
