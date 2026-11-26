import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  CheckCircle2,
  RotateCcw,
  Save,
  Eye,
  EyeOff,
  AlertTriangle,
  Code2,
  Terminal,
  GitCompare,
  BookOpen,
} from "lucide-react";
import { api } from "../lib/api";
import type {
  CodingProblem,
  ComparisonItem,
  OutputPuzzle,
  TheoryQuestion,
  TopicItem,
  TopicProgress,
} from "../lib/types";
import { Badge, difficultyVariant, statusVariant } from "../components/Badge";
import { CodeBlock, MarkdownCode } from "../components/MarkdownCode";

export const TopicStudyPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [allTopics, setAllTopics] = useState<TopicItem[]>([]);
  const [topic, setTopic] = useState<TopicItem | null>(null);
  const [progress, setProgress] = useState<TopicProgress | null>(null);
  const [relatedCoding, setRelatedCoding] = useState<CodingProblem[]>([]);
  const [relatedOutputs, setRelatedOutputs] = useState<OutputPuzzle[]>([]);
  const [relatedComparisons, setRelatedComparisons] = useState<ComparisonItem[]>([]);
  const [relatedTheory, setRelatedTheory] = useState<TheoryQuestion[]>([]);
  const [notes, setNotes] = useState("");
  const [savedNotice, setSavedNotice] = useState(false);
  const [revealedQa, setRevealedQa] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<"lesson" | "coding" | "outputs" | "comparisons">("lesson");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.topics().then((r) => setAllTopics(r.topics));
  }, []);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setRevealedQa({});
    setActiveTab("lesson");
    api
      .topicDetail(id)
      .then((res) => {
        setTopic(res.topic);
        setProgress(res.progress);
        setNotes(res.progress.notes || "");
        setRelatedCoding(res.relatedCoding);
        setRelatedOutputs(res.relatedOutputs);
        setRelatedComparisons(res.relatedComparisons);
        setRelatedTheory(res.relatedTheory);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const updateProgress = async (payload: {
    status?: TopicProgress["status"];
    bookmarked?: boolean;
    needsRevision?: boolean;
    notes?: string;
    addStudySeconds?: number;
  }) => {
    if (!topic) return;
    const res = await api.updateTopicProgress(topic.id, payload);
    setProgress(res.progress);
    setAllTopics((prev) =>
      prev.map((t) => (t.id === topic.id ? { ...t, progress: res.progress } : t))
    );
  };

  const handleSaveNotes = async () => {
    await updateProgress({ notes });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 1500);
  };

  const currentIndex = allTopics.findIndex((t) => t.id === id);
  const prevTopic = currentIndex > 0 ? allTopics[currentIndex - 1] : null;
  const nextTopic =
    currentIndex >= 0 && currentIndex < allTopics.length - 1 ? allTopics[currentIndex + 1] : null;

  if (loading || !topic || !progress) {
    return (
      <div className="max-w-7xl mx-auto py-12 text-center text-sm text-[var(--text-muted)]">
        Loading topic guide...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-12 gap-5">
      {/* Left Topic Navigator */}
      <aside className="xl:col-span-3 panel p-3 max-h-[calc(100vh-7rem)] overflow-y-auto hidden xl:block sticky top-4">
        <div className="px-2 py-1.5 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
          32 Syllabus Topics
        </div>
        <div className="space-y-1 mt-1">
          {allTopics.map((t) => (
            <Link
              key={t.id}
              to={`/topics/${t.id}`}
              className={`flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-xs transition-colors ${
                t.id === topic.id
                  ? "bg-[var(--accent-soft)] text-[var(--accent)] font-semibold"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
              }`}
            >
              <span className="truncate">
                {t.number}. {t.title}
              </span>
              {t.progress.status === "Completed" && (
                <CheckCircle2 className="w-3.5 h-3.5 text-[var(--success)] shrink-0" />
              )}
            </Link>
          ))}
        </div>
      </aside>

      {/* Main Content */}
      <div className="xl:col-span-9 space-y-5 min-w-0">
        {/* Header Bar */}
        <div className="panel p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              to="/roadmap"
              className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--accent)]"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Roadmap
            </Link>

            <div className="flex items-center gap-2">
              {prevTopic && (
                <Link
                  to={`/topics/${prevTopic.id}`}
                  className="px-2.5 py-1 rounded-md border border-[var(--border-subtle)] text-xs hover:bg-[var(--bg-hover)] inline-flex items-center gap-1"
                >
                  <ArrowLeft className="w-3 h-3" /> Prev
                </Link>
              )}
              {nextTopic && (
                <Link
                  to={`/topics/${nextTopic.id}`}
                  className="px-2.5 py-1 rounded-md border border-[var(--border-subtle)] text-xs hover:bg-[var(--bg-hover)] inline-flex items-center gap-1"
                >
                  Next <ArrowRight className="w-3 h-3" />
                </Link>
              )}
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="accent">Topic #{topic.number}</Badge>
                <Badge variant="neutral">
                  Ch {topic.chapterId}: {topic.chapterTitle}
                </Badge>
                <Badge variant={difficultyVariant(topic.difficulty)}>{topic.difficulty}</Badge>
                <Badge variant={statusVariant(progress.status)}>{progress.status}</Badge>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{topic.title}</h1>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  updateProgress({
                    status: progress.status === "Completed" ? "In Progress" : "Completed",
                    needsRevision: false,
                    addStudySeconds: 180,
                  })
                }
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer border ${
                  progress.status === "Completed"
                    ? "bg-[var(--success-soft)] text-[var(--success)] border-emerald-500/30"
                    : "bg-[var(--accent-strong)] text-white border-transparent hover:opacity-90"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {progress.status === "Completed" ? "Completed" : "Mark Completed"}
              </button>

              <button
                type="button"
                onClick={() => updateProgress({ bookmarked: !progress.bookmarked })}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer border ${
                  progress.bookmarked
                    ? "bg-[var(--accent-soft)] text-[var(--accent)] border-sky-500/30"
                    : "border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                }`}
              >
                <Bookmark className="w-3.5 h-3.5" />
                {progress.bookmarked ? "Bookmarked" : "Bookmark"}
              </button>

              <button
                type="button"
                onClick={() =>
                  updateProgress({
                    needsRevision: !progress.needsRevision,
                    status: !progress.needsRevision ? "Needs Revision" : "In Progress",
                  })
                }
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer border ${
                  progress.needsRevision
                    ? "bg-[var(--warning-soft)] text-[var(--warning)] border-amber-500/30"
                    : "border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {progress.needsRevision ? "Needs Revision" : "Flag Revision"}
              </button>
            </div>
          </div>

          {/* Sub-navigation Tabs */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--border-subtle)]">
            <TabBtn
              active={activeTab === "lesson"}
              onClick={() => setActiveTab("lesson")}
              icon={BookOpen}
              label={`Deep Dive & Q&A (${topic.questions.length + relatedTheory.length})`}
            />
            <TabBtn
              active={activeTab === "coding"}
              onClick={() => setActiveTab("coding")}
              icon={Code2}
              label={`Related Coding (${relatedCoding.length})`}
            />
            <TabBtn
              active={activeTab === "outputs"}
              onClick={() => setActiveTab("outputs")}
              icon={Terminal}
              label={`Related Output (${relatedOutputs.length})`}
            />
            <TabBtn
              active={activeTab === "comparisons"}
              onClick={() => setActiveTab("comparisons")}
              icon={GitCompare}
              label={`Comparisons (${relatedComparisons.length})`}
            />
          </div>
        </div>

        {activeTab === "lesson" && (
          <div className="space-y-4">
            {/* Quick Summary & Analogy */}
            {(topic.analogy || topic.simpleExplanation) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {topic.simpleExplanation && (
                  <div className="panel p-4 space-y-2">
                    <h2 className="text-sm font-semibold text-[var(--accent)]">
                      Simple Mental Model
                    </h2>
                    <MarkdownCode content={topic.simpleExplanation} />
                  </div>
                )}
                {topic.analogy && (
                  <div className="panel p-4 space-y-2">
                    <h2 className="text-sm font-semibold text-[var(--success)]">
                      Real-World Analogy
                    </h2>
                    <MarkdownCode content={topic.analogy} />
                  </div>
                )}
              </div>
            )}

            {/* Technical Deep Dive */}
            {topic.technicalExplanation && (
              <div className="panel p-4 sm:p-5 space-y-2">
                <h2 className="text-sm font-semibold">Technical Explanation & Internals</h2>
                <MarkdownCode content={topic.technicalExplanation} />
              </div>
            )}

            {/* Key Definitions & C++ Examples */}
            {topic.definitions.length > 0 && (
              <div className="panel p-4 sm:p-5 space-y-2">
                <h2 className="text-sm font-semibold">Important Definitions</h2>
                <ul className="list-disc pl-5 space-y-1.5 text-sm text-[var(--text-secondary)]">
                  {topic.definitions.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </div>
            )}

            {topic.cppExamples.length > 0 && (
              <div className="panel p-4 sm:p-5 space-y-3">
                <h2 className="text-sm font-semibold">C++17 Code Examples</h2>
                {topic.cppExamples.map((ex, i) => (
                  <MarkdownCode key={i} content={ex} />
                ))}
              </div>
            )}

            {/* Traps & Mistakes */}
            {(topic.interviewTraps.length > 0 || topic.commonMistakes.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {topic.interviewTraps.length > 0 && (
                  <div className="panel p-4 space-y-2 border-amber-500/25">
                    <h2 className="text-sm font-semibold text-[var(--warning)] flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4" /> Interview Traps
                    </h2>
                    <ul className="list-disc pl-5 space-y-1.5 text-xs text-[var(--text-secondary)]">
                      {topic.interviewTraps.map((trap, i) => (
                        <li key={i}>{trap}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {topic.commonMistakes.length > 0 && (
                  <div className="panel p-4 space-y-2 border-rose-500/25">
                    <h2 className="text-sm font-semibold text-[var(--danger)]">
                      Common Candidate Mistakes
                    </h2>
                    <ul className="list-disc pl-5 space-y-1.5 text-xs text-[var(--text-secondary)]">
                      {topic.commonMistakes.map((m, i) => (
                        <li key={i}>{m}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Topic Q&As (Answers hidden until revealed) */}
            <div className="panel p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">
                  Topic Interview Questions ({topic.questions.length})
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    const allOpen = topic.questions.every((q) => revealedQa[q.id]);
                    const next: Record<string, boolean> = {};
                    topic.questions.forEach((q) => (next[q.id] = !allOpen));
                    setRevealedQa(next);
                  }}
                  className="text-xs text-[var(--accent)] hover:underline cursor-pointer"
                >
                  Toggle All Answers
                </button>
              </div>
              <div className="space-y-3">
                {topic.questions.map((qa, idx) => {
                  const isOpen = !!revealedQa[qa.id];
                  return (
                    <div
                      key={qa.id}
                      className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4 space-y-2.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-[var(--text-muted)]">
                            Q{idx + 1}
                          </span>
                          <Badge variant={difficultyVariant(qa.difficulty)}>{qa.difficulty}</Badge>
                          <Badge variant="neutral">{qa.level}</Badge>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setRevealedQa((prev) => ({ ...prev, [qa.id]: !prev[qa.id] }))
                          }
                          className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)] cursor-pointer"
                        >
                          {isOpen ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          {isOpen ? "Hide Answer" : "Reveal Answer"}
                        </button>
                      </div>
                      <div className="text-sm font-semibold">{qa.question}</div>

                      {isOpen && (
                        <div className="pt-2 border-t border-[var(--border-subtle)] space-y-2.5 text-xs">
                          <div>
                            <div className="font-semibold text-[var(--success)] mb-1">Answer</div>
                            <MarkdownCode content={qa.answer} />
                          </div>
                          {qa.technicalExplanation && (
                            <div>
                              <div className="font-semibold text-[var(--accent)] mb-1">
                                Technical Depth
                              </div>
                              <MarkdownCode content={qa.technicalExplanation} />
                            </div>
                          )}
                          {qa.example && (
                            <div>
                              <div className="font-semibold text-[var(--text-primary)] mb-1">
                                Example
                              </div>
                              <MarkdownCode content={qa.example} />
                            </div>
                          )}
                          {qa.commonMistake && (
                            <div className="text-[var(--danger)]">
                              <strong>Common Mistake:</strong> {qa.commonMistake}
                            </div>
                          )}
                          {qa.followUp && (
                            <div className="text-[var(--warning)]">
                              <strong>Interviewer Follow-Up:</strong> {qa.followUp}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {relatedTheory.length > 0 && (
              <div className="panel p-4 sm:p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold">
                    Core Interview Questions Linked to This Topic ({relatedTheory.length})
                  </h2>
                  <Link
                    to={`/theory?topic=${topic.id}`}
                    className="text-xs text-[var(--accent)] hover:underline"
                  >
                    Practice in Theory Arena →
                  </Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {relatedTheory.slice(0, 6).map((q) => (
                    <Link
                      key={q.id}
                      to={`/theory?topic=${topic.id}`}
                      className="p-3 rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <Badge variant={difficultyVariant(q.difficulty)}>{q.difficulty}</Badge>
                        <Badge variant={statusVariant(q.attempt?.status || "Untouched")}>
                          {q.attempt?.status || "Untouched"}
                        </Badge>
                      </div>
                      <div className="font-medium line-clamp-2">{q.question}</div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Personal Notes */}
            <div className="panel p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">Personal Revision Notes</h2>
                <button
                  type="button"
                  onClick={handleSaveNotes}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--accent-strong)] text-white text-xs font-medium cursor-pointer hover:opacity-90"
                >
                  <Save className="w-3.5 h-3.5" />
                  {savedNotice ? "Saved!" : "Save Notes"}
                </button>
              </div>
              <textarea
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Write key interview takeaways, C++ memory layout reminders, or verbal crisp answers..."
                className="w-full rounded-lg p-3 bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-xs outline-none focus:border-[var(--accent)]"
              />
            </div>
          </div>
        )}

        {activeTab === "coding" && (
          <div className="panel p-4 space-y-3">
            <h2 className="text-sm font-semibold">Related Coding Problems</h2>
            {relatedCoding.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)]">
                No direct coding problems linked exclusively to this topic. Browse all 51 problems in Coding Arena.
              </p>
            ) : (
              <div className="space-y-2">
                {relatedCoding.map((c) => (
                  <Link
                    key={c.id}
                    to={`/coding?id=${c.id}`}
                    className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)]"
                  >
                    <div>
                      <div className="text-sm font-semibold">
                        #{c.number} {c.title}
                      </div>
                      <div className="text-xs text-[var(--text-muted)]">
                        {c.concepts.join(" · ")}
                      </div>
                    </div>
                    <Badge variant={difficultyVariant(c.difficulty)}>{c.difficulty}</Badge>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "outputs" && (
          <div className="panel p-4 space-y-3">
            <h2 className="text-sm font-semibold">Related Output Puzzles</h2>
            {relatedOutputs.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)]">
                No output puzzles directly tagged here. Explore all 52 puzzles in Output Arena.
              </p>
            ) : (
              <div className="space-y-3">
                {relatedOutputs.map((o) => (
                  <div
                    key={o.id}
                    className="p-3 rounded-lg bg-[var(--bg-elevated)] space-y-2 border border-[var(--border-subtle)]"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">
                        Puzzle #{o.number}: {o.title}
                      </span>
                      <Link
                        to={`/outputs?id=${o.id}`}
                        className="text-xs text-[var(--accent)] hover:underline"
                      >
                        Solve in Output Arena →
                      </Link>
                    </div>
                    <CodeBlock code={o.code} lang="cpp" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "comparisons" && (
          <div className="space-y-4">
            {relatedComparisons.length === 0 ? (
              <div className="panel p-4 text-xs text-[var(--text-muted)]">
                No comparison tables attached to this topic. View all 22 tables in Comparisons.
              </div>
            ) : (
              relatedComparisons.map((cmp) => (
                <div key={cmp.id} className="panel p-4 space-y-3">
                  <h3 className="text-sm font-semibold">
                    Comparison #{cmp.number}: {cmp.title}
                  </h3>
                  <div className="overflow-x-auto rounded-lg border border-[var(--border-subtle)]">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-[var(--bg-elevated)]">
                        <tr>
                          {cmp.headers.map((h, i) => (
                            <th key={i} className="px-3 py-2 border-b border-[var(--border-subtle)]">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {cmp.rows.map((row, rIdx) => (
                          <tr key={rIdx} className="border-b border-[var(--border-subtle)] last:border-b-0">
                            {row.map((cell, cIdx) => (
                              <td key={cIdx} className="px-3 py-2 text-[var(--text-secondary)]">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {cmp.codeExample && <MarkdownCode content={cmp.codeExample} />}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const TabBtn: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: React.FC<{ className?: string }>;
  label: string;
}> = ({ active, onClick, icon: Icon, label }) => (
  <button
    type="button"
    onClick={onClick}
    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer border transition-colors ${
      active
        ? "bg-[var(--accent-soft)] text-[var(--accent)] border-sky-500/30"
        : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:text-[var(--text-primary)]"
    }`}
  >
    <Icon className="w-3.5 h-3.5" />
    {label}
  </button>
);
