import { TopicPicker } from "../../../components/TopicPicker";

interface DomainTopicFilterProps {
  domains: string[];
  topicsByDomain: Record<string, string[]>;
  domain: string;
  topic: string;
  onDomainChange: (v: string) => void;
  onTopicChange: (v: string) => void;
}

/** Baris filter: dropdown domain + TopicPicker (memakai komponen lama). */
export function DomainTopicFilter({
  domains,
  topicsByDomain,
  domain,
  topic,
  onDomainChange,
  onTopicChange,
}: DomainTopicFilterProps) {
  const domainLabel = domain || "Semua domain";
  const filterLabel = topic ? `${domainLabel} · ${topic}` : domainLabel;

  return (
    <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
      <label htmlFor="domain" className="font-medium">
        Cari di:
      </label>
      <select
        id="domain"
        value={domain}
        onChange={(e) => onDomainChange(e.target.value)}
        title="Batasi pencarian ke domain tertentu"
        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 [color-scheme:light] focus:border-brand-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:[color-scheme:dark]"
      >
        <option value="">Semua domain</option>
        {domains.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>

      <label className="font-medium">Topik:</label>
      <TopicPicker
        topicsByDomain={topicsByDomain}
        domain={domain}
        value={topic}
        onChange={onTopicChange}
      />

      <span className="text-slate-400">({filterLabel})</span>
    </div>
  );
}
