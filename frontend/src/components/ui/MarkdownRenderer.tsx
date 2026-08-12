import { Fragment, type ReactNode } from "react";

/**
 * Markdown renderer ringan tanpa dependency (pengganti react-markdown).
 * Mendukung: heading, bold, italic, strikethrough, inline code, code block,
 * link, list (ul/ol), blockquote, horizontal rule, dan tabel pipa sederhana.
 * Cukup untuk jawaban AI yang ringkas. Aman: tidak meng-inject HTML mentah.
 */
export function MarkdownRenderer({ content }: { content: string }) {
  return <div className="td-md space-y-2 text-sm leading-relaxed">{renderBlocks(content)}</div>;
}

function renderBlocks(src: string): ReactNode[] {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block ```lang
    if (/^\s*```/.test(line)) {
      const fence = line.replace(/^\s*```/, "").trim();
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^\s*```/.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      i++; // lewati penutup ```
      blocks.push(
        <pre
          key={key++}
          className="overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100 dark:bg-black/60"
        >
          <code data-lang={fence}>{buf.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    // Baris kosong
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Horizontal rule
    if (/^\s*(---|\*\*\*|___)\s*$/.test(line)) {
      blocks.push(<hr key={key++} className="my-3 border-slate-200 dark:border-slate-700" />);
      i++;
      continue;
    }

    // Heading
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      const sizes = ["text-lg", "text-base", "text-base", "text-sm", "text-sm", "text-sm"];
      const Tag = ("h" + Math.min(level, 6)) as keyof JSX.IntrinsicElements;
      blocks.push(
        <Tag
          key={key++}
          className={"mt-1 font-semibold text-slate-800 dark:text-slate-100 " + sizes[level - 1]}
        >
          {renderInline(h[2])}
        </Tag>,
      );
      i++;
      continue;
    }

    // Blockquote
    if (/^\s*>\s?/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*>\s?/, ""));
        i++;
      }
      blocks.push(
        <blockquote
          key={key++}
          className="border-l-2 border-brand-300 pl-3 text-slate-600 dark:border-brand-700 dark:text-slate-300"
        >
          {buf.map((b, bi) => (
            <p key={bi}>{renderInline(b)}</p>
          ))}
        </blockquote>,
      );
      continue;
    }

    // Tabel pipa (butuh baris pemisah |---|)
    if (
      line.includes("|") &&
      i + 1 < lines.length &&
      /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1]) &&
      lines[i + 1].includes("-")
    ) {
      const header = splitRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes("|") && lines[i].trim() !== "") {
        rows.push(splitRow(lines[i]));
        i++;
      }
      blocks.push(
        <div key={key++} className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                {header.map((c, ci) => (
                  <th
                    key={ci}
                    className="border border-slate-200 bg-slate-50 px-2 py-1 text-left font-semibold dark:border-slate-700 dark:bg-slate-800"
                  >
                    {renderInline(c)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri}>
                  {r.map((c, ci) => (
                    <td
                      key={ci}
                      className="border border-slate-200 px-2 py-1 align-top dark:border-slate-700"
                    >
                      {renderInline(c)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    // Unordered list
    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*+]\s+/, ""));
        i++;
      }
      blocks.push(
        <ul key={key++} className="list-disc space-y-1 pl-5">
          {items.map((it, ii) => (
            <li key={ii}>{renderInline(it)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    // Ordered list
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+[.)]\s+/, ""));
        i++;
      }
      blocks.push(
        <ol key={key++} className="list-decimal space-y-1 pl-5">
          {items.map((it, ii) => (
            <li key={ii}>{renderInline(it)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    // Paragraf (gabungkan baris berurutan)
    const buf: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^\s*(#{1,6}\s|>|[-*+]\s|\d+[.)]\s|```|---|\*\*\*|___)/.test(lines[i])
    ) {
      buf.push(lines[i]);
      i++;
    }
    blocks.push(<p key={key++}>{renderInline(buf.join(" "))}</p>);
  }

  return blocks;
}

function splitRow(row: string): string[] {
  return row
    .replace(/^\s*\|/, "")
    .replace(/\|\s*$/, "")
    .split("|")
    .map((c) => c.trim());
}

/** Parsing inline: `code`, **bold**, *italic*, ~~strike~~, [teks](url). */
function renderInline(text: string): ReactNode {
  const nodes: ReactNode[] = [];
  const regex =
    /(`[^`]+`)|(\*\*[^*]+\*\*)|(__[^_]+__)|(~~[^~]+~~)|(\*[^*]+\*)|(_[^_]+_)|(\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;

  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) nodes.push(<Fragment key={key++}>{text.slice(last, m.index)}</Fragment>);
    const tok = m[0];

    if (tok.startsWith("`")) {
      nodes.push(
        <code
          key={key++}
          className="rounded bg-slate-100 px-1 py-0.5 text-[0.85em] text-pink-600 dark:bg-slate-800 dark:text-pink-400"
        >
          {tok.slice(1, -1)}
        </code>,
      );
    } else if (tok.startsWith("**") || tok.startsWith("__")) {
      nodes.push(
        <strong key={key++} className="font-semibold">
          {tok.slice(2, -2)}
        </strong>,
      );
    } else if (tok.startsWith("~~")) {
      nodes.push(<del key={key++}>{tok.slice(2, -2)}</del>);
    } else if (tok.startsWith("[")) {
      const lm = tok.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (lm) {
        nodes.push(
          <a
            key={key++}
            href={lm[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-600 underline hover:text-brand-700 dark:text-brand-400"
          >
            {lm[1]}
          </a>,
        );
      } else {
        nodes.push(<Fragment key={key++}>{tok}</Fragment>);
      }
    } else if (tok.startsWith("*") || tok.startsWith("_")) {
      nodes.push(
        <em key={key++} className="italic">
          {tok.slice(1, -1)}
        </em>,
      );
    }
    last = regex.lastIndex;
  }

  if (last < text.length) nodes.push(<Fragment key={key++}>{text.slice(last)}</Fragment>);
  return nodes;
}
