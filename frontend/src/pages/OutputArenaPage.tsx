import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  Bookmark,
  CheckCircle2,
  HelpCircle,
  RotateCcw,
  Save,
  Send,
  XCircle,
} from "lucide-react";
import { api } from "../lib/api";
import type { OutputPuzzle } from "../lib/types";
import { Badge, statusVariant } from "../components/Badge";
import { CodeBlock, MarkdownCode } from "../components/MarkdownCode";

export const OutputArenaPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialId = searchParams.get("id");

  const [puzzles, setPuzzles] = useState<OutputPuzzle[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedId, setSelectedId] = useState(initialId || "puzzle-1");

  const [prediction, setPrediction] = useState("");
  const [claimType, setClaimType] = useState<"output" | "ub" | "compile_error">("output");
  const [showHint, setShowHint] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [notes, setNotes] = useState("");
  const [noteSaved, setNoteSaved] = useState(false);

  useEffect(() => {
    api
      .outputs()
      .then((res) => {
        setPuzzles(res.puzzles);
        if (!initialId && res.puzzles.length > 0) {
          setSelectedId(res.puzzles[0].id);
        }
      })
      .finally(() => setLoading(false));
  }, [initialId]);

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(puzzles.map((p) => p.category)))],
    [puzzles]
  );

  const filtered = useMemo(() => {
    return puzzles.filter((p) => {
      if (categoryFilter !== "All" && p.category !== categoryFilter) return false;
      if (statusFilter === "Solved" && !p.attempt.isCorrect) return false;
      if (statusFilter === "Incorrect" && (!p.attempt.attempted || p.attempt.isCorrect)) return false;
      if (statusFilter === "Unattempted" && p.attempt.attempted) return false;
      return true;
    });
  }, [puzzles, categoryFilter, statusFilter]);

  const current = puzzles.find((p) => p.id === selectedId) || filtered[0] || null;

  useEffect(() => {
    if (!current) return;
    setPrediction(current.attempt.userPrediction || "");
    setClaimType("output");
    setShowHint(false);
    setRevealed(current.attempt.attempted);
    setNotes(current.attempt.notes || "");
  }, [current?.id]);

  const handleSubmit = async (overrideClaim?: "output" | "ub" | "compile_error", overrideText?: string) => {
    if (!current) return;
    const cType = overrideClaim ?? claimType;
    const predText = overrideText ?? prediction;
    const res = await api.submitOutput(current.id, predText, cType);
    setPuzzles((prev) =>
      prev.map((p) => (p.id === current.id ? { ...p, attempt: res.attempt } : p))
    );
    setRevealed(true);
  };

  const updateMeta = async (payload: {
    bookmarked?: boolean;
    needsRevision?: boolean;
    notes?: string;
  }) => {
    if (!current) return;
    const res = await api.updateOutputMeta(current.id, payload);
    setPuzzles((prev) =>
      prev.map((p) => (p.id === current.id ? { ...p, attempt: res.attempt } : p))
    );
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-12 text-center text-sm text-[var(--text-muted)]">
        Loading 52 tricky C++17 output puzzles...
      </div>
    );
  }

  const correctCount = puzzles.filter((p) => p.attempt.isCorrect).length;

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">C++17 Output Prediction Arena</h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            52 tricky C++ OOP snippets covering vtables, slicing, diamond dispatch, UB, and compile errors.
          </p>
        </div>
        <Badge variant="success">
          {correctCount}/{puzzles.length} Correct Predictions
        </Badge>
      </div>

      {/* Filters */}
      <div className="panel p-3.5 flex flex-wrap items-center gap-3">
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-2.5 py-1.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-xs outline-none"
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        <div className="flex gap-1.5">
          {["All", "Unattempted", "Solved", "Incorrect"].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1 rounded-md text-xs cursor-pointer border ${
                statusFilter === s
                  ? "bg-[var(--accent-soft)] text-[var(--accent)] border-sky-500/30"
                  : "bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-secondary)]"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Sidebar List */}
        <div className="lg:col-span-4 panel p-2.5 max-h-[72vh] overflow-y-auto space-y-1">
          {filtered.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedId(p.id)}
              className={`w-full text-left p-2.5 rounded-lg transition-colors cursor-pointer border ${
                p.id === current?.id
                  ? "bg-[var(--accent-soft)] border-sky-500/30"
                  : "border-transparent hover:bg-[var(--bg-hover)]"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-mono text-[var(--text-muted)]">
                  Puzzle #{p.number}
                </span>
                <div className="flex items-center gap-1">
                  {p.attempt.attempted && (
                    <Badge variant={p.attempt.isCorrect ? "success" : "danger"}>
                      {p.attempt.isCorrect ? "Correct" : "Wrong"}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="text-xs font-medium truncate mt-0.5">{p.title}</div>
            </button>
          ))}
        </div>

        {/* Main Workspace */}
        <div className="lg:col-span-8 panel p-5 space-y-4">
          {!current ? (
            <div className="py-12 text-center text-sm text-[var(--text-muted)]">
              No puzzles match the selected filter.
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[var(--border-subtle)]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="accent">Puzzle #{current.number}</Badge>
                    <Badge variant="neutral">{current.category}</Badge>
                    {current.attempt.attempted && (
                      <Badge variant={statusVariant(current.attempt.isCorrect ? "Correct" : "Incorrect")}>
                        {current.attempt.isCorrect ? "Correct" : "Needs Review"}
                      </Badge>
                    )}
                  </div>
                  <h2 className="text-base sm:text-lg font-bold mt-1">{current.title}</h2>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => updateMeta({ bookmarked: !current.attempt.bookmarked })}
                    className={`p-1.5 rounded-md border cursor-pointer ${
                      current.attempt.bookmarked
                        ? "bg-[var(--accent-soft)] text-[var(--accent)] border-sky-500/30"
                        : "border-[var(--border-subtle)] text-[var(--text-muted)]"
                    }`}
                  >
                    <Bookmark className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => updateMeta({ needsRevision: !current.attempt.needsRevision })}
                    className={`p-1.5 rounded-md border cursor-pointer ${
                      current.attempt.needsRevision
                        ? "bg-[var(--warning-soft)] text-[var(--warning)] border-amber-500/30"
                        : "border-[var(--border-subtle)] text-[var(--text-muted)]"
                    }`}
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <CodeBlock code={current.code} lang="cpp" />

              {current.hint && (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowHint((h) => !h)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--warning)] cursor-pointer"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    {showHint ? "Hide Hint" : "Need a Hint?"}
                  </button>
                  {showHint && (
                    <div className="mt-2 p-3 rounded-lg bg-[var(--warning-soft)] border border-amber-500/30 text-xs">
                      {current.hint}
                    </div>
                  )}
                </div>
              )}

              {/* Prediction Form */}
              <div className="space-y-2.5 p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                <div className="text-xs font-semibold">Predict Exact Stdout or Compiler/UB Behavior</div>
                <textarea
                  rows={3}
                  value={prediction}
                  onChange={(e) => {
                    setPrediction(e.target.value);
                    setClaimType("output");
                  }}
                  placeholder="Type exact output line by line..."
                  className="w-full p-2.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-xs font-mono outline-none focus:border-[var(--accent)]"
                />

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSubmit("output", prediction)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[var(--accent-strong)] text-white text-xs font-medium cursor-pointer hover:opacity-90"
                  >
                    <Send className="w-3.5 h-3.5" /> Check Prediction
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPrediction("Undefined Behavior");
                      setClaimType("ub");
                      handleSubmit("ub", "Undefined Behavior");
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--danger-soft)] text-[var(--danger)] border border-rose-500/30 text-xs font-medium cursor-pointer"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" /> Predict Undefined Behavior
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPrediction("Compile Error");
                      setClaimType("compile_error");
                      handleSubmit("compile_error", "Compile Error");
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--warning-soft)] text-[var(--warning)] border border-amber-500/30 text-xs font-medium cursor-pointer"
                  >
                    Predict Compile Error
                  </button>
                </div>
              </div>

              {/* Official Answer Reveal */}
              {revealed && (
                <div className="space-y-3 p-4 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)]">
                  <div className="flex flex-wrap items-center gap-2">
                    {current.attempt.isCorrect ? (
                      <Badge variant="success">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Matched Expected Behavior
                      </Badge>
                    ) : (
                      <Badge variant="danger">
                        <XCircle className="w-3.5 h-3.5" /> Mismatch — Review Dry Run
                      </Badge>
                    )}
                    {current.isUndefinedBehavior && (
                      <Badge variant="danger">UNDEFINED BEHAVIOR (ISO C++17)</Badge>
                    )}
                    {current.isCompileError && (
                      <Badge variant="warning">COMPILE ERROR CASE</Badge>
                    )}
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-[var(--success)] mb-1">
                      Expected Result
                    </div>
                    <pre className="p-2.5 rounded-lg bg-[var(--code-bg)] text-slate-100 text-xs font-mono overflow-x-auto">
                      {current.expectedOutput}
                    </pre>
                  </div>

                  {current.rawOutputExplanation && (
                    <MarkdownCode content={current.rawOutputExplanation} />
                  )}

                  {current.lineByLine && (
                    <div>
                      <div className="text-xs font-semibold text-[var(--accent)] mb-1">
                        Line-by-Line Execution Trace
                      </div>
                      <MarkdownCode content={current.lineByLine} />
                    </div>
                  )}

                  {current.whyIncorrect && (
                    <div>
                      <div className="text-xs font-semibold text-[var(--danger)] mb-1">
                        Why Common Predictions Fail
                      </div>
                      <MarkdownCode content={current.whyIncorrect} />
                    </div>
                  )}

                  {current.interviewTrap && (
                    <div className="p-2.5 rounded-lg bg-[var(--warning-soft)] border border-amber-500/30 text-xs text-[var(--warning)]">
                      <strong>Interview Trap:</strong> {current.interviewTrap}
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              <div className="pt-2 border-t border-[var(--border-subtle)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">Puzzle Notes</span>
                  <button
                    type="button"
                    onClick={async () => {
                      await updateMeta({ notes });
                      setNoteSaved(true);
                      setTimeout(() => setNoteSaved(false), 1200);
                    }}
                    className="inline-flex items-center gap-1 text-xs text-[var(--accent)] cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" /> {noteSaved ? "Saved" : "Save Note"}
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Write down the vtable/destructor ordering trap here..."
                  className="w-full p-2.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-xs outline-none"
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
