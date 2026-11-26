import React, { useEffect, useState } from "react";
import { CheckCircle2, Eye, EyeOff, Save } from "lucide-react";
import { api } from "../lib/api";
import type { SolidAndModernContent, SolidModuleProgress } from "../lib/types";
import { Badge } from "../components/Badge";
import { MarkdownCode } from "../components/MarkdownCode";

type TabId =
  | "solid-S"
  | "solid-O"
  | "solid-L"
  | "solid-I"
  | "solid-D"
  | "rule-of-350"
  | "copy-assignment"
  | "inline-static";

export const SolidModernPage: React.FC = () => {
  const [content, setContent] = useState<SolidAndModernContent | null>(null);
  const [progressMap, setProgressMap] = useState<Record<string, SolidModuleProgress>>({});
  const [activeTab, setActiveTab] = useState<TabId>("solid-S");
  const [revealedSolutions, setRevealedSolutions] = useState<Record<string, boolean>>({});
  const [notesDraft, setNotesDraft] = useState("");
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    api.solidModern().then((res) => {
      setContent(res.content);
      setProgressMap(res.progressMap);
    });
  }, []);

  useEffect(() => {
    setNotesDraft(progressMap[activeTab]?.notes || "");
    setRevealedSolutions({});
  }, [activeTab, progressMap]);

  if (!content) {
    return (
      <div className="max-w-7xl mx-auto py-12 text-center text-sm text-[var(--text-muted)]">
        Loading SOLID & Modern C++17 modules...
      </div>
    );
  }

  const tabs: { id: TabId; label: string }[] = [
    ...content.solid.map((s) => ({ id: s.id as TabId, label: `${s.code} — ${s.title.split("(")[0].trim()}` })),
    { id: "rule-of-350", label: "Rule of 3 / 5 / 0 & RAII" },
    { id: "copy-assignment", label: "Copy Assignment Operator" },
    { id: "inline-static", label: "inline static (C++17)" },
  ];

  const currentProgress = progressMap[activeTab] || {
    moduleId: activeTab,
    completed: false,
    solvedPracticeJson: "{}",
    notes: "",
  };

  const updateModule = async (payload: {
    completed?: boolean;
    solvedPracticeJson?: string;
    notes?: string;
  }) => {
    const res = (await api.updateSolidModern(activeTab, payload)) as {
      progress: SolidModuleProgress;
    };
    setProgressMap((prev) => ({ ...prev, [activeTab]: res.progress }));
  };

  const solidPrinciple = content.solid.find((s) => s.id === activeTab);

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">SOLID Principles & Modern C++17 Deep Dive</h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Side-by-side Bad vs Refactored C++17 architecture + Rule of 3/5/0, Copy Assignment & C++17 inline static.
          </p>
        </div>
        <Badge variant="success">
          {Object.values(progressMap).filter((p) => p.completed).length}/{tabs.length} Modules Mastered
        </Badge>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5">
        {tabs.map((t) => {
          const done = progressMap[t.id]?.completed;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer ${
                activeTab === t.id
                  ? "bg-[var(--accent-soft)] text-[var(--accent)] border-sky-500/30"
                  : "bg-[var(--bg-secondary)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {done && <CheckCircle2 className="w-3.5 h-3.5 text-[var(--success)]" />}
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Module Header */}
      <div className="panel p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
          <h2 className="text-lg font-bold">
            {solidPrinciple
              ? `${solidPrinciple.code}: ${solidPrinciple.title}`
              : activeTab === "rule-of-350"
              ? "Rule of 3 / Rule of 5 / Rule of 0 & RAII"
              : activeTab === "copy-assignment"
              ? "Copy Assignment Operator & Copy-and-Swap Idiom"
              : "C++17 inline static Data Members"}
          </h2>
          <button
            type="button"
            onClick={() => updateModule({ completed: !currentProgress.completed })}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer ${
              currentProgress.completed
                ? "bg-[var(--success-soft)] text-[var(--success)] border-emerald-500/30"
                : "bg-[var(--accent-strong)] text-white border-transparent"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            {currentProgress.completed ? "Completed" : "Mark Module Completed"}
          </button>
        </div>

        {solidPrinciple ? (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="panel-elevated p-4 space-y-1.5">
                <div className="text-xs font-semibold text-[var(--accent)]">Simple Definition</div>
                <MarkdownCode content={solidPrinciple.simpleExplanation} />
                {solidPrinciple.whyItExists && (
                  <div className="pt-2">
                    <div className="text-xs font-semibold text-[var(--text-primary)]">
                      Why It Exists
                    </div>
                    <MarkdownCode content={solidPrinciple.whyItExists} />
                  </div>
                )}
              </div>
              <div className="panel-elevated p-4 space-y-1.5">
                <div className="text-xs font-semibold text-[var(--success)]">Real-World Analogy</div>
                <MarkdownCode content={solidPrinciple.analogy} />
                {solidPrinciple.violations && (
                  <div className="pt-2">
                    <div className="text-xs font-semibold text-[var(--warning)]">
                      How to Spot Violations
                    </div>
                    <MarkdownCode content={solidPrinciple.violations} />
                  </div>
                )}
              </div>
            </div>

            {/* Side-by-Side Bad vs Improved */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="panel-elevated p-4 border-rose-500/30 space-y-2">
                <Badge variant="danger">BAD CODE (Violates {solidPrinciple.code})</Badge>
                <MarkdownCode content={solidPrinciple.badCode} />
                {solidPrinciple.whatsWrong && (
                  <div className="text-xs text-[var(--text-secondary)]">
                    <MarkdownCode content={solidPrinciple.whatsWrong} />
                  </div>
                )}
              </div>
              <div className="panel-elevated p-4 border-emerald-500/30 space-y-2">
                <Badge variant="success">REFACTORED C++17 DESIGN</Badge>
                <MarkdownCode content={solidPrinciple.improvedCode} />
                {solidPrinciple.improvementExplanation && (
                  <div className="text-xs text-[var(--text-secondary)]">
                    <MarkdownCode content={solidPrinciple.improvementExplanation} />
                  </div>
                )}
              </div>
            </div>

            {/* Principle Q&As */}
            {solidPrinciple.questions.length > 0 && (
              <div className="space-y-2.5">
                <h3 className="text-sm font-semibold">
                  Interview Questions for {solidPrinciple.code} ({solidPrinciple.questions.length})
                </h3>
                {solidPrinciple.questions.map((qa, i) => {
                  const key = `qa-${i}`;
                  const open = !!revealedSolutions[key];
                  return (
                    <div key={i} className="panel-elevated p-3.5 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs font-semibold">
                          Q{i + 1}. {qa.question}
                        </div>
                        <button
                          type="button"
                          onClick={() => setRevealedSolutions((r) => ({ ...r, [key]: !r[key] }))}
                          className="text-xs text-[var(--accent)] inline-flex items-center gap-1 shrink-0 cursor-pointer"
                        >
                          {open ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          {open ? "Hide" : "Answer"}
                        </button>
                      </div>
                      {open && <MarkdownCode content={qa.answer} />}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Refactoring Practice */}
            {solidPrinciple.practiceProblems.length > 0 && (
              <div className="space-y-2.5">
                <h3 className="text-sm font-semibold">
                  Refactoring Exercises ({solidPrinciple.practiceProblems.length})
                </h3>
                {solidPrinciple.practiceProblems.map((pr, i) => {
                  const key = `pr-${i}`;
                  const open = !!revealedSolutions[key];
                  return (
                    <div key={i} className="panel-elevated p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[var(--warning)]">
                          Exercise {i + 1}: {pr.title}
                        </span>
                        <button
                          type="button"
                          onClick={() => setRevealedSolutions((r) => ({ ...r, [key]: !r[key] }))}
                          className="text-xs text-[var(--accent)] cursor-pointer"
                        >
                          {open ? "Hide Solution" : "Show C++17 Solution"}
                        </button>
                      </div>
                      <MarkdownCode content={pr.prompt} />
                      {open && (
                        <div className="pt-2 border-t border-[var(--border-subtle)]">
                          <MarkdownCode content={pr.solution} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <MarkdownCode
            content={
              activeTab === "rule-of-350"
                ? content.ruleOf350Markdown
                : activeTab === "copy-assignment"
                ? content.copyAssignmentMarkdown
                : content.inlineStaticMarkdown
            }
          />
        )}

        {/* Module Notes */}
        <div className="pt-3 border-t border-[var(--border-subtle)] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold">Module Revision Notes</span>
            <button
              type="button"
              onClick={async () => {
                await updateModule({ notes: notesDraft });
                setSavedNotice(true);
                setTimeout(() => setSavedNotice(false), 1200);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[var(--accent-strong)] text-white text-xs cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" /> {savedNotice ? "Saved!" : "Save Note"}
            </button>
          </div>
          <textarea
            rows={3}
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            placeholder="Write key design rules or copy-and-swap invariants..."
            className="w-full p-2.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-xs outline-none"
          />
        </div>
      </div>
    </div>
  );
};
