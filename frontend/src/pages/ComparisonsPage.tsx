import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Bookmark, CheckCircle2, Eye, EyeOff, Save } from "lucide-react";
import { api } from "../lib/api";
import type { ComparisonItem } from "../lib/types";
import { Badge } from "../components/Badge";
import { MarkdownCode } from "../components/MarkdownCode";

export const ComparisonsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialId = searchParams.get("id");
  const [comparisons, setComparisons] = useState<ComparisonItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [onlyRevised, setOnlyRevised] = useState<"all" | "pending" | "revised">("all");
  const [quickRevisionMode, setQuickRevisionMode] = useState(false);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [savedId, setSavedId] = useState<string | null>(null);

  useEffect(() => {
    api
      .comparisons()
      .then((res) => {
        setComparisons(res.comparisons);
        const notesInit: Record<string, string> = {};
        res.comparisons.forEach((c) => {
          notesInit[c.id] = c.progress.notes || "";
        });
        setNotesDraft(notesInit);
      })
      .finally(() => setLoading(false));
  }, []);

  const updateProgress = async (
    c: ComparisonItem,
    payload: { bookmarked?: boolean; revised?: boolean; notes?: string }
  ) => {
    const res = (await api.updateComparisonProgress(c.id, payload)) as {
      progress: ComparisonItem["progress"];
    };
    setComparisons((prev) =>
      prev.map((item) => (item.id === c.id ? { ...item, progress: res.progress } : item))
    );
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-12 text-center text-sm text-[var(--text-muted)]">
        Loading 22 comparison tables...
      </div>
    );
  }

  const filtered = comparisons.filter((c) => {
    if (initialId && !search.trim() && onlyRevised === "all") return c.id === initialId;
    if (onlyRevised === "pending" && c.progress.revised) return false;
    if (onlyRevised === "revised" && !c.progress.revised) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        c.title.toLowerCase().includes(q) ||
        c.headers.some((h) => h.toLowerCase().includes(q)) ||
        c.rows.some((r) => r.some((cell) => cell.toLowerCase().includes(q)))
      );
    }
    return true;
  });

  const revisedCount = comparisons.filter((c) => c.progress.revised).length;

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Interview Comparison Tables</h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            22 crisp side-by-side "Difference Between" tables with C++17 examples and quick verbal revision mode.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="success">
            {revisedCount}/{comparisons.length} Revised
          </Badge>
          <button
            type="button"
            onClick={() => setQuickRevisionMode((q) => !q)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer ${
              quickRevisionMode
                ? "bg-[var(--accent-soft)] text-[var(--accent)] border-sky-500/30"
                : "bg-[var(--bg-secondary)] border-[var(--border-subtle)] text-[var(--text-secondary)]"
            }`}
          >
            {quickRevisionMode ? "Exit Flash Mode" : "Quick Recall Mode"}
          </button>
        </div>
      </div>

      <div className="panel p-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search comparison e.g. Overloading vs Overriding, struct vs class..."
            className="px-3 py-1.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-xs w-full sm:w-96 outline-none focus:border-[var(--accent)]"
          />
          {initialId && (
            <button
              type="button"
              onClick={() => setSearchParams({})}
              className="px-2.5 py-1.5 rounded-lg bg-[var(--accent-soft)] text-[var(--accent)] text-xs font-medium cursor-pointer"
            >
              Show All {comparisons.length}
            </button>
          )}
        </div>
        <div className="flex gap-1.5">
          {(["all", "pending", "revised"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setOnlyRevised(f)}
              className={`px-2.5 py-1 rounded-md text-xs capitalize cursor-pointer border ${
                onlyRevised === f
                  ? "bg-[var(--accent-soft)] text-[var(--accent)] border-sky-500/30"
                  : "bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-secondary)]"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {filtered.map((cmp) => {
          const showTable = !quickRevisionMode || !!revealed[cmp.id];
          return (
            <div key={cmp.id} className="panel p-4 sm:p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Badge variant="accent">#{cmp.number}</Badge>
                  <h2 className="text-base font-semibold">{cmp.title}</h2>
                </div>
                <div className="flex items-center gap-2">
                  {quickRevisionMode && (
                    <button
                      type="button"
                      onClick={() => setRevealed((r) => ({ ...r, [cmp.id]: !r[cmp.id] }))}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[var(--accent-strong)] text-white text-xs cursor-pointer"
                    >
                      {showTable ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      {showTable ? "Hide Table" : "Reveal Table"}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => updateProgress(cmp, { revised: !cmp.progress.revised })}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs border cursor-pointer ${
                      cmp.progress.revised
                        ? "bg-[var(--success-soft)] text-[var(--success)] border-emerald-500/30"
                        : "border-[var(--border-subtle)] text-[var(--text-secondary)]"
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {cmp.progress.revised ? "Revised" : "Mark Revised"}
                  </button>

                  <button
                    type="button"
                    onClick={() => updateProgress(cmp, { bookmarked: !cmp.progress.bookmarked })}
                    className={`p-1.5 rounded-md border cursor-pointer ${
                      cmp.progress.bookmarked
                        ? "bg-[var(--accent-soft)] text-[var(--accent)] border-sky-500/30"
                        : "border-[var(--border-subtle)] text-[var(--text-muted)]"
                    }`}
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {showTable ? (
                <>
                  <div className="overflow-x-auto rounded-lg border border-[var(--border-subtle)]">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-[var(--bg-elevated)]">
                        <tr>
                          {cmp.headers.map((h, i) => (
                            <th key={i} className="px-3 py-2 font-semibold border-b border-[var(--border-subtle)]">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {cmp.rows.map((row, ri) => (
                          <tr key={ri} className="border-b border-[var(--border-subtle)] last:border-b-0">
                            {row.map((cell, ci) => (
                              <td
                                key={ci}
                                className={`px-3 py-2 align-top ${
                                  ci === 0 ? "font-medium text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
                                }`}
                              >
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {cmp.codeExample && <MarkdownCode content={cmp.codeExample} />}
                  {cmp.note && (
                    <div className="p-2.5 rounded-lg bg-[var(--bg-elevated)] text-xs text-[var(--text-secondary)]">
                      <strong>Key Takeaway:</strong> {cmp.note}
                    </div>
                  )}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      value={notesDraft[cmp.id] ?? ""}
                      onChange={(e) =>
                        setNotesDraft((n) => ({ ...n, [cmp.id]: e.target.value }))
                      }
                      placeholder="Quick comparison note..."
                      className="flex-1 px-2.5 py-1.5 rounded-md bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-xs outline-none"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        await updateProgress(cmp, { notes: notesDraft[cmp.id] ?? "" });
                        setSavedId(cmp.id);
                        setTimeout(() => setSavedId(null), 1200);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-strong)] text-xs cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {savedId === cmp.id ? "Saved" : "Save"}
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-xs text-[var(--text-muted)] italic">
                  Recall the key differences aloud before clicking Reveal Table.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
