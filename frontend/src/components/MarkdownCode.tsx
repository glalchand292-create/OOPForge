import React, { useState } from "react";
import { Check, Copy } from "lucide-react";

interface MarkdownCodeProps {
  content: string;
  className?: string;
}

/**
 * Lightweight deterministic renderer for our extracted C++17 study markdown:
 * handles fenced code blocks, headings, bullet lists, inline code, bold spans,
 * and pipe tables without brittle external DOM plugins.
 */
export const MarkdownCode: React.FC<MarkdownCodeProps> = ({ content, className = "" }) => {
  if (!content) return null;

  const segments = splitCodeFences(content);

  return (
    <div className={`space-y-3 text-sm leading-relaxed text-[var(--text-primary)] ${className}`}>
      {segments.map((seg, idx) =>
        seg.type === "code" ? (
          <CodeBlock key={idx} code={seg.value} lang={seg.lang || "cpp"} />
        ) : (
          <ProseBlock key={idx} text={seg.value} />
        )
      )}
    </div>
  );
};

export const CodeBlock: React.FC<{ code: string; lang?: string }> = ({ code, lang = "cpp" }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div className="rounded-lg overflow-hidden border border-[var(--border-strong)] bg-[var(--code-bg)] my-2">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#0f172a] border-b border-slate-800 text-[11px] font-mono text-slate-400">
        <span>{lang.toUpperCase()}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 hover:text-sky-400 transition-colors cursor-pointer"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <pre className="p-3.5 overflow-x-auto text-xs leading-5 font-mono text-slate-100 m-0">
        <code>{code.trimEnd()}</code>
      </pre>
    </div>
  );
};

function splitCodeFences(raw: string): Array<{ type: "text" | "code"; value: string; lang?: string }> {
  const out: Array<{ type: "text" | "code"; value: string; lang?: string }> = [];
  const regex = /```([a-zA-Z0-9_+-]*)\r?\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(raw)) !== null) {
    if (match.index > lastIndex) {
      out.push({ type: "text", value: raw.slice(lastIndex, match.index) });
    }
    out.push({ type: "code", lang: match[1] || "cpp", value: match[2] });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < raw.length) {
    out.push({ type: "text", value: raw.slice(lastIndex) });
  }
  return out;
}

const ProseBlock: React.FC<{ text: string }> = ({ text }) => {
  const lines = text.split(/\r?\n/);
  const nodes: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    // Markdown table block
    if (trimmed.startsWith("|") && i + 1 < lines.length && lines[i + 1].trim().startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i].trim());
        i++;
      }
      nodes.push(<MarkdownTable key={`tbl-${i}`} lines={tableLines} />);
      continue;
    }

    if (trimmed.startsWith("### ")) {
      nodes.push(
        <h4 key={`h3-${i}`} className="text-sm font-semibold text-[var(--accent)] pt-2">
          {renderInline(trimmed.slice(4))}
        </h4>
      );
      i++;
      continue;
    }

    if (trimmed.startsWith("## ")) {
      nodes.push(
        <h3 key={`h2-${i}`} className="text-base font-semibold text-[var(--text-primary)] pt-3 border-b border-[var(--border-subtle)] pb-1">
          {renderInline(trimmed.slice(3))}
        </h3>
      );
      i++;
      continue;
    }

    if (trimmed.startsWith("# ")) {
      nodes.push(
        <h2 key={`h1-${i}`} className="text-lg font-bold text-[var(--text-primary)] pt-2">
          {renderInline(trimmed.slice(2))}
        </h2>
      );
      i++;
      continue;
    }

    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      const items: string[] = [];
      while (i < lines.length && (lines[i].trim().startsWith("- ") || lines[i].trim().startsWith("* "))) {
        items.push(lines[i].trim().slice(2));
        i++;
      }
      nodes.push(
        <ul key={`ul-${i}`} className="list-disc pl-5 space-y-1 text-[var(--text-secondary)]">
          {items.map((item, j) => (
            <li key={j}>{renderInline(item)}</li>
          ))}
        </ul>
      );
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ""));
        i++;
      }
      nodes.push(
        <ol key={`ol-${i}`} className="list-decimal pl-5 space-y-1 text-[var(--text-secondary)]">
          {items.map((item, j) => (
            <li key={j}>{renderInline(item)}</li>
          ))}
        </ol>
      );
      continue;
    }

    if (trimmed === "---") {
      nodes.push(<hr key={`hr-${i}`} className="border-[var(--border-subtle)] my-2" />);
      i++;
      continue;
    }

    nodes.push(
      <p key={`p-${i}`} className="text-[var(--text-secondary)] whitespace-pre-wrap">
        {renderInline(line)}
      </p>
    );
    i++;
  }

  return <>{nodes}</>;
};

const MarkdownTable: React.FC<{ lines: string[] }> = ({ lines }) => {
  const parseRow = (r: string) =>
    r
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((c) => c.trim());

  const headers = parseRow(lines[0]);
  const rows = lines.slice(2).map(parseRow);

  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--border-subtle)] my-2">
      <table className="w-full text-xs text-left border-collapse">
        <thead className="bg-[var(--bg-elevated)] text-[var(--text-primary)]">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="px-3 py-2 font-semibold border-b border-[var(--border-subtle)]">
                {renderInline(h)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri} className="border-b border-[var(--border-subtle)] last:border-b-0">
              {r.map((cell, ci) => (
                <td key={ci} className="px-3 py-2 text-[var(--text-secondary)] align-top">
                  {renderInline(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--accent)] font-mono text-[12px]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
      return (
        <strong key={idx} className="font-semibold text-[var(--text-primary)]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}
