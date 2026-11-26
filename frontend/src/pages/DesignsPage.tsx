import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Bookmark, CheckCircle2, CheckSquare, Square, Save } from "lucide-react";
import { api } from "../lib/api";
import type { DesignProblem } from "../lib/types";
import { Badge, difficultyVariant } from "../components/Badge";
import { MarkdownCode } from "../components/MarkdownCode";

const CHECKLIST_STEPS = [
  { key: "req", label: "Requirements & Core Entities" },
  { key: "rel", label: "Class Relationships & Ownership" },
  { key: "uml", label: "UML Class Diagram Walkthrough" },
  { key: "cpp", label: "C++17 Interfaces & Implementation" },
  { key: "follow", label: "Edge Cases & Scale Follow-ups" },
];

export const DesignsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialId = searchParams.get("id");
  const [designs, setDesigns] = useState<DesignProblem[]>([]);
  const [selectedId, setSelectedId] = useState(initialId || "design-1");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [notes, setNotes] = useState("");
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    api
      .designs()
      .then((res) => {
        setDesigns(res.designs);
        if (res.designs.length > 0) {
          const picked =
            res.designs.find((d) => d.id === initialId) || res.designs[0];
          setSelectedId(picked.id);
          setNotes(picked.progress.notes || "");
        }
      })
      .finally(() => setLoading(false));
  }, [initialId]);

  const current = designs.find((d) => d.id === selectedId) || null;

  useEffect(() => {
    if (current) setNotes(current.progress.notes || "");
  }, [current?.id]);

  const updateProgress = async (
    d: DesignProblem,
    payload: {
      completed?: boolean;
      bookmarked?: boolean;
      checklistJson?: string;
      notes?: string;
    }
  ) => {
    const res = (await api.updateDesignProgress(d.id, payload)) as {
      progress: DesignProblem["progress"];
    };
    setDesigns((prev) =>
      prev.map((item) => (item.id === d.id ? { ...item, progress: res.progress } : item))
    );
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-12 text-center text-sm text-[var(--text-muted)]">
        Loading 20 real-world OOP system designs...
      </div>
    );
  }

  const filtered = designs.filter((d) =>
    d.title.toLowerCase().includes(search.trim().toLowerCase())
  );
  const completedCount = designs.filter((d) => d.progress.completed).length;

  const parsedChecklist: Record<string, boolean> = (() => {
    if (!current) return {};
    try {
      return JSON.parse(current.progress.checklistJson || "{}") as Record<string, boolean>;
    } catch {
      return {};
    }
  })();

  const toggleChecklist = (key: string) => {
    if (!current) return;
    const next = { ...parsedChecklist, [key]: !parsedChecklist[key] };
    updateProgress(current, { checklistJson: JSON.stringify(next) });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Real-World C++ OOP System Designs</h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            20 Low-Level Design (LLD) problems with entities, relationships, UML diagrams, C++17 classes, and follow-ups.
          </p>
        </div>
        <Badge variant="success">
          {completedCount}/{designs.length} Designs Completed
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-4 panel p-3 space-y-2 max-h-[78vh] overflow-y-auto">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Parking Lot, ATM, LRU Cache..."
            className="w-full px-3 py-1.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-xs outline-none"
          />
          <div className="space-y-1">
            {filtered.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setSelectedId(d.id)}
                className={`w-full text-left p-2.5 rounded-lg transition-colors cursor-pointer flex items-center justify-between gap-2 border ${
                  d.id === selectedId
                    ? "bg-[var(--accent-soft)] border-sky-500/30"
                    : "border-transparent hover:bg-[var(--bg-hover)]"
                }`}
              >
                <div className="min-w-0">
                  <div className="text-xs font-semibold truncate">
                    #{d.number}. {d.title}
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)] truncate">
                    {d.difficulty}
                  </div>
                </div>
                {d.progress.completed && (
                  <CheckCircle2 className="w-4 h-4 text-[var(--success)] shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-8 space-y-4">
          {current && (
            <>
              <div className="panel p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="accent">Design #{current.number}</Badge>
                      <Badge variant={difficultyVariant(current.difficulty)}>
                        {current.difficulty}
                      </Badge>
                    </div>
                    <h2 className="text-lg font-bold">{current.title}</h2>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        updateProgress(current, { completed: !current.progress.completed })
                      }
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer ${
                        current.progress.completed
                          ? "bg-[var(--success-soft)] text-[var(--success)] border-emerald-500/30"
                          : "bg-[var(--accent-strong)] text-white border-transparent"
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {current.progress.completed ? "Completed" : "Mark Completed"}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateProgress(current, { bookmarked: !current.progress.bookmarked })
                      }
                      className={`p-1.5 rounded-lg border cursor-pointer ${
                        current.progress.bookmarked
                          ? "bg-[var(--accent-soft)] text-[var(--accent)] border-sky-500/30"
                          : "border-[var(--border-subtle)] text-[var(--text-muted)]"
                      }`}
                    >
                      <Bookmark className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Interactive LLD Checklist */}
                <div className="p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-2">
                  <div className="text-xs font-semibold text-[var(--text-primary)]">
                    Interview Walkthrough Checklist
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {CHECKLIST_STEPS.map((st) => {
                      const done = !!parsedChecklist[st.key];
                      return (
                        <button
                          key={st.key}
                          type="button"
                          onClick={() => toggleChecklist(st.key)}
                          className="flex items-center gap-2 text-xs text-left p-1.5 rounded hover:bg-[var(--bg-hover)] cursor-pointer"
                        >
                          {done ? (
                            <CheckSquare className="w-4 h-4 text-[var(--success)] shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                          )}
                          <span className={done ? "line-through text-[var(--text-muted)]" : ""}>
                            {st.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <Section title="Requirements" body={current.requirements} />
                <Section title="Classes & Responsibilities" body={current.classesRequired} />
                {current.responsibilities && (
                  <Section title="Core Design Details" body={current.responsibilities} />
                )}
                <Section title="Class Relationships & OOP Concepts" body={`${current.relationships}\n\n${current.oopConcepts}`} />

                {current.umlDiagram && (
                  <div className="space-y-1.5">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                      UML / Architecture Diagram
                    </h3>
                    <MarkdownCode content={current.umlDiagram} />
                  </div>
                )}

                {(current.cppApproach || current.cppSnippet) && (
                  <div className="space-y-1.5">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                      C++17 Design Implementation
                    </h3>
                    {current.cppApproach && <MarkdownCode content={current.cppApproach} />}
                    {current.cppSnippet && <MarkdownCode content={current.cppSnippet} />}
                  </div>
                )}

                {current.followUps && <Section title="Interviewer Follow-Up Questions" body={current.followUps} />}

                {/* Design Notes */}
                <div className="pt-2 border-t border-[var(--border-subtle)] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">Whiteboard Notes</span>
                    <button
                      type="button"
                      onClick={async () => {
                        await updateProgress(current, { notes });
                        setSavedNotice(true);
                        setTimeout(() => setSavedNotice(false), 1200);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[var(--accent-strong)] text-white text-xs cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" /> {savedNotice ? "Saved" : "Save Note"}
                    </button>
                  </div>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Sketch extension ideas (e.g., Strategy pattern for pricing, thread-safety mutex)..."
                    className="w-full p-2.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-xs outline-none"
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const Section: React.FC<{ title: string; body: string }> = ({ title, body }) => {
  if (!body?.trim()) return null;
  return (
    <div className="space-y-1">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
        {title}
      </h3>
      <MarkdownCode content={body} />
    </div>
  );
};
