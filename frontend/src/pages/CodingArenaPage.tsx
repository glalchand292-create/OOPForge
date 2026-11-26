import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Editor from "@monaco-editor/react";
import {
  Play,
  Send,
  RotateCcw,
  Bookmark,
  CheckCircle2,
  Eye,
  EyeOff,
  HelpCircle,
  Save,
  List,
  X,
} from "lucide-react";
import { api } from "../lib/api";
import type { CodingProblem, CodingSubmission, SandboxExecutionResult } from "../lib/types";
import { Badge, difficultyVariant, statusVariant } from "../components/Badge";
import { MarkdownCode } from "../components/MarkdownCode";

export const CodingArenaPage: React.FC<{ theme: "dark" | "light" }> = ({ theme }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [problems, setProblems] = useState<CodingProblem[]>([]);
  const [compilerAvailable, setCompilerAvailable] = useState(true);
  const [compilerName, setCompilerName] = useState("g++");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [diffFilter, setDiffFilter] = useState("All");
  const [search, setSearch] = useState("");

  const [selectedId, setSelectedId] = useState(searchParams.get("id") || "code-1");
  const [detail, setDetail] = useState<CodingProblem | null>(null);
  const [submissions, setSubmissions] = useState<CodingSubmission[]>([]);

  const [code, setCode] = useState("");
  const [stdin, setStdin] = useState("");
  const [running, setRunning] = useState(false);
  const [execResult, setExecResult] = useState<SandboxExecutionResult | null>(null);
  const [expectedOutput, setExpectedOutput] = useState("");

  const [leftTab, setLeftTab] = useState<"problem" | "solution" | "submissions" | "notes">(
    "problem"
  );
  const [showHint, setShowHint] = useState(false);
  const [revealRef, setRevealRef] = useState(false);
  const [notes, setNotes] = useState("");
  const [noteSaved, setNoteSaved] = useState(false);

  useEffect(() => {
    api.codingList().then((res) => {
      setProblems(res.problems);
      setCompilerAvailable(res.compilerAvailable);
      setCompilerName(res.compilerName);
      if (!searchParams.get("id") && res.problems.length > 0) {
        setSelectedId(res.problems[0].id);
      }
    });
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setExecResult(null);
    setShowHint(false);
    setRevealRef(false);
    setLeftTab("problem");
    api.codingDetail(selectedId).then((res) => {
      setDetail(res.problem);
      setSubmissions(res.submissions);
      setCode(res.status?.savedCode || res.problem.starterCode);
      setExpectedOutput(res.problem.expectedStdout || res.problem.exampleOutput);
      setNotes(res.status?.notes || "");
    });
  }, [selectedId]);

  const handleSelectProblem = (id: string) => {
    setSelectedId(id);
    setSearchParams({ id });
    setDrawerOpen(false);
  };

  const handleRun = async () => {
    if (!detail) return;
    setRunning(true);
    try {
      const res = await api.runCode(detail.id, code, stdin);
      setExecResult(res.result);
      setExpectedOutput(res.expectedOutput);
    } finally {
      setRunning(false);
    }
  };

  const handleSubmit = async () => {
    if (!detail) return;
    setRunning(true);
    try {
      const res = await api.submitCode(detail.id, code);
      setExecResult(res.result);
      setExpectedOutput(res.expectedOutput);
      setSubmissions((prev) => [res.submission, ...prev]);
      setDetail((prev) => (prev ? { ...prev, status: res.status } : prev));
      setProblems((prev) =>
        prev.map((p) => (p.id === detail.id ? { ...p, status: res.status } : p))
      );
    } finally {
      setRunning(false);
    }
  };

  const handleMetaUpdate = async (payload: {
    savedCode?: string;
    bookmarked?: boolean;
    needsRevision?: boolean;
    notes?: string;
  }) => {
    if (!detail) return;
    const res = await api.updateCodingMeta(detail.id, payload);
    setDetail((prev) => (prev ? { ...prev, status: res.status } : prev));
    setProblems((prev) =>
      prev.map((p) => (p.id === detail.id ? { ...p, status: res.status } : p))
    );
  };

  const filteredProblems = problems.filter((p) => {
    if (diffFilter !== "All" && p.difficulty !== diffFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        p.title.toLowerCase().includes(q) ||
        p.concepts.some((c) => c.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const solvedCount = problems.filter((p) => p.status?.solved).length;

  return (
    <div className="max-w-[1600px] mx-auto space-y-3">
      {/* Top Toolbar */}
      <div className="panel px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-strong)] text-xs font-medium hover:bg-[var(--bg-hover)] cursor-pointer"
          >
            <List className="w-3.5 h-3.5" /> Problems ({solvedCount}/{problems.length})
          </button>

          {detail && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold">
                #{detail.number}. {detail.title}
              </span>
              <Badge variant={difficultyVariant(detail.difficulty)}>{detail.difficulty}</Badge>
              {detail.status?.solved && (
                <Badge variant="success">
                  <CheckCircle2 className="w-3 h-3" /> Solved
                </Badge>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {detail && (
            <>
              <button
                type="button"
                onClick={() => handleMetaUpdate({ bookmarked: !detail.status?.bookmarked })}
                className={`p-1.5 rounded-md border cursor-pointer ${
                  detail.status?.bookmarked
                    ? "bg-[var(--accent-soft)] text-[var(--accent)] border-sky-500/30"
                    : "border-[var(--border-subtle)] text-[var(--text-muted)]"
                }`}
                title="Bookmark problem"
              >
                <Bookmark className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleMetaUpdate({ needsRevision: !detail.status?.needsRevision })}
                className={`p-1.5 rounded-md border cursor-pointer ${
                  detail.status?.needsRevision
                    ? "bg-[var(--warning-soft)] text-[var(--warning)] border-amber-500/30"
                    : "border-[var(--border-subtle)] text-[var(--text-muted)]"
                }`}
                title="Flag for revision"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setCode(detail.starterCode);
                  handleMetaUpdate({ savedCode: detail.starterCode });
                }}
                className="px-2.5 py-1.5 rounded-lg border border-[var(--border-subtle)] text-xs hover:bg-[var(--bg-hover)] cursor-pointer"
              >
                Reset Starter
              </button>
            </>
          )}

          <button
            type="button"
            disabled={running || !detail}
            onClick={handleRun}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-strong)] text-xs font-medium hover:bg-[var(--bg-hover)] disabled:opacity-50 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 text-[var(--accent)]" />
            {running ? "Compiling..." : "Run C++17"}
          </button>

          <button
            type="button"
            disabled={running || !detail}
            onClick={handleSubmit}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[var(--success)] text-slate-950 text-xs font-semibold hover:opacity-90 disabled:opacity-50 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            Submit & Verify
          </button>
        </div>
      </div>

      {!compilerAvailable && (
        <div className="panel px-4 py-2.5 border-amber-500/40 bg-[var(--warning-soft)] text-xs text-[var(--warning)]">
          Local C++17 compiler not detected on PATH. You can write, save draft code, study hints & reference solutions cleanly in Editor-Only mode.
        </div>
      )}

      {/* Split Workspace */}
      {detail && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 min-h-[75vh]">
          {/* Left Panel: Problem Statement / Reference / Submissions / Notes */}
          <div className="lg:col-span-5 panel flex flex-col max-h-[82vh] overflow-hidden">
            <div className="flex items-center gap-1 px-3 py-2 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
              {(["problem", "solution", "submissions", "notes"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setLeftTab(t)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize cursor-pointer ${
                    leftTab === t
                      ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {t === "submissions" ? `Submissions (${submissions.length})` : t}
                </button>
              ))}
            </div>

            <div className="p-4 overflow-y-auto space-y-4 flex-1">
              {leftTab === "problem" && (
                <>
                  <div className="flex flex-wrap gap-1.5">
                    {detail.concepts.map((c) => (
                      <Badge key={c} variant="neutral">
                        {c}
                      </Badge>
                    ))}
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                      Problem Statement
                    </h3>
                    <MarkdownCode content={detail.problemStatement} />
                  </div>

                  {detail.constraints && (
                    <div className="space-y-1">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                        Constraints & Requirements
                      </h3>
                      <MarkdownCode content={detail.constraints} />
                    </div>
                  )}

                  {(detail.exampleOutput || detail.expectedStdout) && (
                    <div className="space-y-1">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                        Expected Output
                      </h3>
                      <pre className="p-3 rounded-lg bg-[var(--code-bg)] text-slate-100 text-xs font-mono overflow-x-auto border border-[var(--border-subtle)]">
                        {detail.expectedStdout || detail.exampleOutput}
                      </pre>
                    </div>
                  )}

                  {detail.hint && (
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => setShowHint((h) => !h)}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--warning)] cursor-pointer"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                        {showHint ? "Hide Design Hint" : "Show Design Hint"}
                      </button>
                      {showHint && (
                        <div className="p-3 rounded-lg bg-[var(--warning-soft)] border border-amber-500/30 text-xs">
                          <MarkdownCode content={detail.hint} />
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {leftTab === "solution" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[var(--text-secondary)]">
                      Try solving in C++17 first before viewing the official solution.
                    </span>
                    <button
                      type="button"
                      onClick={() => setRevealRef((r) => !r)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[var(--accent-soft)] text-[var(--accent)] text-xs font-medium cursor-pointer"
                    >
                      {revealRef ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      {revealRef ? "Hide" : "Reveal Solution"}
                    </button>
                  </div>

                  {revealRef && (
                    <div className="space-y-3">
                      <MarkdownCode content={`\`\`\`cpp\n${detail.referenceSolution}\n\`\`\``} />
                      {detail.explanation && (
                        <div>
                          <div className="text-xs font-semibold text-[var(--accent)]">Explanation</div>
                          <MarkdownCode content={detail.explanation} />
                        </div>
                      )}
                      {detail.dryRun && (
                        <div>
                          <div className="text-xs font-semibold text-[var(--success)]">Dry Run</div>
                          <MarkdownCode content={detail.dryRun} />
                        </div>
                      )}
                      {detail.complexity && (
                        <div className="text-xs text-[var(--text-secondary)]">
                          <strong>Complexity:</strong> {detail.complexity}
                        </div>
                      )}
                      {detail.commonMistakes && (
                        <div className="text-xs text-[var(--danger)]">
                          <strong>Common Mistakes:</strong> {detail.commonMistakes}
                        </div>
                      )}
                      {detail.followUp && (
                        <div className="text-xs text-[var(--warning)]">
                          <strong>Follow-up:</strong> {detail.followUp}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {leftTab === "submissions" && (
                <div className="space-y-2.5">
                  {submissions.length === 0 ? (
                    <p className="text-xs text-[var(--text-muted)]">
                      No submissions recorded yet. Click Submit & Verify to test your C++17 code.
                    </p>
                  ) : (
                    submissions.map((sub) => (
                      <div
                        key={sub.id}
                        className="p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <Badge variant={statusVariant(sub.status)}>{sub.status}</Badge>
                          <span className="text-[11px] font-mono text-[var(--text-muted)]">
                            {sub.runtimeMs} ms · {new Date(sub.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setCode(sub.code)}
                          className="text-xs text-[var(--accent)] hover:underline cursor-pointer"
                        >
                          Load submitted code into editor
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {leftTab === "notes" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">Problem Notes</span>
                    <button
                      type="button"
                      onClick={async () => {
                        await handleMetaUpdate({ notes });
                        setNoteSaved(true);
                        setTimeout(() => setNoteSaved(false), 1200);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[var(--accent-strong)] text-white text-xs cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" /> {noteSaved ? "Saved!" : "Save"}
                    </button>
                  </div>
                  <textarea
                    rows={10}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Record class design notes, ownership choices, or virtual dispatch gotchas..."
                    className="w-full p-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-xs outline-none focus:border-[var(--accent)]"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Monaco C++17 Editor + Execution Console */}
          <div className="lg:col-span-7 flex flex-col gap-3 max-h-[82vh]">
            <div className="panel overflow-hidden flex-1 min-h-[340px] flex flex-col">
              <div className="px-3.5 py-2 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)] flex items-center justify-between text-xs">
                <span className="font-mono text-[var(--text-secondary)]">
                  main.cpp · ISO C++17 ({compilerAvailable ? compilerName : "Offline Editor"})
                </span>
                <span className="text-[11px] text-[var(--text-muted)]">
                  Auto-saved on Run / Submit
                </span>
              </div>
              <div className="flex-1 min-h-[300px]">
                <Editor
                  height="100%"
                  defaultLanguage="cpp"
                  theme={theme === "dark" ? "vs-dark" : "light"}
                  value={code}
                  onChange={(v) => setCode(v ?? "")}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    fontFamily: "JetBrains Mono, monospace",
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 2,
                  }}
                />
              </div>
            </div>

            {/* Bottom Console */}
            <div className="panel p-3.5 space-y-2.5 max-h-64 overflow-y-auto">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold">Sandbox Console</span>
                  {execResult && (
                    <>
                      <Badge variant={statusVariant(execResult.status)}>{execResult.status}</Badge>
                      <span className="text-[11px] font-mono text-[var(--text-muted)]">
                        {execResult.runtimeMs} ms
                      </span>
                    </>
                  )}
                </div>
                <input
                  value={stdin}
                  onChange={(e) => setStdin(e.target.value)}
                  placeholder="Optional custom stdin..."
                  className="px-2.5 py-1 rounded-md bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-xs font-mono w-56 outline-none"
                />
              </div>

              {!execResult ? (
                <div className="text-xs text-[var(--text-muted)]">
                  Click <strong>Run C++17</strong> to compile and execute in an isolated temporary sandbox, or <strong>Submit & Verify</strong> to compare against expected output.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                  <div>
                    <div className="text-[11px] text-[var(--text-muted)] mb-1">
                      {execResult.compileOutput
                        ? "Compiler Diagnostic"
                        : execResult.stderr
                        ? "Runtime Stderr"
                        : "Your Stdout"}
                    </div>
                    <pre className="p-2.5 rounded-lg bg-[var(--code-bg)] text-slate-100 overflow-x-auto max-h-36 border border-[var(--border-subtle)]">
                      {execResult.compileOutput ||
                        execResult.stderr ||
                        execResult.stdout ||
                        "(no output)"}
                    </pre>
                  </div>
                  <div>
                    <div className="text-[11px] text-[var(--text-muted)] mb-1">
                      Expected Stdout
                    </div>
                    <pre className="p-2.5 rounded-lg bg-[var(--code-bg)] text-emerald-300 overflow-x-auto max-h-36 border border-[var(--border-subtle)]">
                      {expectedOutput || "(no reference stdout)"}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Problem Picker Drawer */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex justify-start"
          onClick={() => setDrawerOpen(false)}
        >
          <div
            className="w-full max-w-md bg-[var(--bg-secondary)] border-r border-[var(--border-strong)] h-full flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
              <div className="text-sm font-bold">51 C++ OOP Coding Problems</div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 space-y-2 border-b border-[var(--border-subtle)]">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search problem title or concept..."
                className="w-full px-3 py-1.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-xs outline-none"
              />
              <div className="flex gap-1.5">
                {["All", "Beginner", "Intermediate", "Advanced"].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDiffFilter(d)}
                    className={`px-2 py-1 rounded text-[11px] cursor-pointer border ${
                      diffFilter === d
                        ? "bg-[var(--accent-soft)] text-[var(--accent)] border-sky-500/30"
                        : "bg-[var(--bg-elevated)] border-[var(--border-subtle)]"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-[var(--border-subtle)]">
              {filteredProblems.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectProblem(p.id)}
                  className={`w-full px-4 py-3 text-left hover:bg-[var(--bg-hover)] flex items-center justify-between gap-2 cursor-pointer ${
                    p.id === selectedId ? "bg-[var(--accent-soft)]" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold truncate">
                      #{p.number}. {p.title}
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)] truncate">
                      {p.concepts.join(" · ")}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge variant={difficultyVariant(p.difficulty)}>{p.difficulty}</Badge>
                    {p.status?.solved && (
                      <CheckCircle2 className="w-4 h-4 text-[var(--success)]" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
