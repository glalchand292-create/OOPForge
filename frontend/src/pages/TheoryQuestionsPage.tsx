import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Bookmark,
  CheckCircle2,
  Eye,
  EyeOff,
  HelpCircle,
  RotateCcw,
  Save,
  Shuffle,
  SkipForward,
  XCircle,
} from "lucide-react";
import { api } from "../lib/api";
import type { TheoryQuestion, TopicItem } from "../lib/types";
import { Badge, difficultyVariant, statusVariant } from "../components/Badge";
import { MarkdownCode } from "../components/MarkdownCode";

type PracticeMode = "Sequential" | "Random" | "Topic-wise" | "Weak Topics" | "Revision Mode";

export const TheoryQuestionsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialTopic = searchParams.get("topic") || "All";
  const initialQuestionId = searchParams.get("q");

  const [questions, setQuestions] = useState<TheoryQuestion[]>([]);
  const [topics, setTopics] = useState<TopicItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [mode, setMode] = useState<PracticeMode>("Sequential");
  const [difficulty, setDifficulty] = useState("All");
  const [topicFilter, setTopicFilter] = useState(initialTopic);
  const [statusFilter, setStatusFilter] = useState("All");
  const [sourceFilter, setSourceFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [randomSeed, setRandomSeed] = useState(0);

  const [activeIndex, setActiveIndex] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    Promise.all([api.questions(), api.topics()])
      .then(([qRes, tRes]) => {
        setQuestions(qRes.questions);
        setTopics(tRes.topics);
        if (initialQuestionId) {
          const filteredInit = qRes.questions.filter(
            (item) => initialTopic === "All" || item.topicId === initialTopic
          );
          const idx = filteredInit.findIndex((item) => item.id === initialQuestionId);
          if (idx >= 0) setActiveIndex(idx);
        }
      })
      .finally(() => setLoading(false));
  }, [initialQuestionId, initialTopic]);

  const weakTopicIds = useMemo(
    () =>
      new Set(
        topics
          .filter((t) => t.progress.needsRevision || t.progress.status === "Needs Revision")
          .map((t) => t.id)
      ),
    [topics]
  );

  const filteredQuestions = useMemo(() => {
    let list = questions.filter((q) => {
      if (difficulty !== "All" && !q.difficulty.toLowerCase().includes(difficulty.toLowerCase())) {
        return false;
      }
      if (topicFilter !== "All" && q.topicId !== topicFilter) return false;
      if (statusFilter !== "All" && q.attempt.status !== statusFilter) return false;
      if (sourceFilter !== "All" && q.source !== sourceFilter) return false;

      if (mode === "Weak Topics") {
        const isWeak =
          weakTopicIds.has(q.topicId) ||
          q.attempt.status === "Incorrect" ||
          q.attempt.needsRevision;
        if (!isWeak) return false;
      }
      if (mode === "Revision Mode") {
        if (!q.attempt.needsRevision && !q.attempt.bookmarked && q.attempt.status !== "Incorrect") {
          return false;
        }
      }
      if (search.trim()) {
        const s = search.toLowerCase();
        if (
          !q.question.toLowerCase().includes(s) &&
          !q.category.toLowerCase().includes(s) &&
          !q.answer.toLowerCase().includes(s)
        ) {
          return false;
        }
      }
      return true;
    });

    if (mode === "Random") {
      const copy = [...list];
      let seed = randomSeed + 1;
      for (let i = copy.length - 1; i > 0; i--) {
        seed = (seed * 9301 + 49297) % 233280;
        const j = seed % (i + 1);
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      list = copy;
    }
    return list;
  }, [
    questions,
    difficulty,
    topicFilter,
    statusFilter,
    sourceFilter,
    mode,
    search,
    randomSeed,
    weakTopicIds,
  ]);

  const currentQ = filteredQuestions[activeIndex] || null;

  useEffect(() => {
    setShowHint(false);
    setShowAnswer(false);
    setNotesDraft(currentQ?.attempt.notes || "");
  }, [currentQ?.id]);

  useEffect(() => {
    if (activeIndex >= filteredQuestions.length) {
      setActiveIndex(0);
    }
  }, [filteredQuestions.length, activeIndex]);

  const updateAttempt = async (
    q: TheoryQuestion,
    payload: {
      status?: "Untouched" | "Solved" | "Incorrect" | "Skipped";
      bookmarked?: boolean;
      needsRevision?: boolean;
      notes?: string;
    }
  ) => {
    const res = (await api.updateQuestionAttempt(q.id, payload)) as {
      attempt: TheoryQuestion["attempt"];
    };
    setQuestions((prev) =>
      prev.map((item) => (item.id === q.id ? { ...item, attempt: res.attempt } : item))
    );
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-12 text-center text-sm text-[var(--text-muted)]">
        Loading 201 C++ OOP interview questions...
      </div>
    );
  }

  const solvedCount = questions.filter((q) => q.attempt.status === "Solved").length;

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      {/* Top Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Interview Theory Question Bank</h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            {questions.length} authentic C++17 interview questions (105 Core + 96 Topic-wise). Answers stay hidden until you reveal.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="success">
            {solvedCount}/{questions.length} Solved
          </Badge>
          {mode === "Random" && (
            <button
              type="button"
              onClick={() => {
                setRandomSeed((s) => s + 1);
                setActiveIndex(0);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-xs cursor-pointer hover:bg-[var(--bg-hover)]"
            >
              <Shuffle className="w-3.5 h-3.5" /> Reshuffle
            </button>
          )}
        </div>
      </div>

      {/* Mode & Filters */}
      <div className="panel p-3.5 space-y-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-[var(--text-muted)] mr-1">Practice Mode:</span>
          {(["Sequential", "Random", "Topic-wise", "Weak Topics", "Revision Mode"] as PracticeMode[]).map(
            (m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setActiveIndex(0);
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer border ${
                  mode === m
                    ? "bg-[var(--accent-soft)] text-[var(--accent)] border-sky-500/30"
                    : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--border-subtle)]"
                }`}
              >
                {m}
              </button>
            )
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setActiveIndex(0);
            }}
            placeholder="Search question text..."
            className="px-3 py-1.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-xs outline-none focus:border-[var(--accent)]"
          />

          <select
            value={difficulty}
            onChange={(e) => {
              setDifficulty(e.target.value);
              setActiveIndex(0);
            }}
            className="px-2.5 py-1.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-xs outline-none"
          >
            <option value="All">All Difficulties</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
            <option value="Tricky">Tricky</option>
          </select>

          <select
            value={topicFilter}
            onChange={(e) => {
              setTopicFilter(e.target.value);
              setActiveIndex(0);
            }}
            className="px-2.5 py-1.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-xs outline-none"
          >
            <option value="All">All 32 Topics</option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.number}. {t.title}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setActiveIndex(0);
            }}
            className="px-2.5 py-1.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-xs outline-none"
          >
            <option value="All">All Statuses</option>
            <option value="Untouched">Untouched</option>
            <option value="Solved">Solved</option>
            <option value="Incorrect">Incorrect</option>
            <option value="Skipped">Skipped</option>
          </select>

          <select
            value={sourceFilter}
            onChange={(e) => {
              setSourceFilter(e.target.value);
              setActiveIndex(0);
            }}
            className="px-2.5 py-1.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-xs outline-none"
          >
            <option value="All">All Sources</option>
            <option value="Top105">105 Core Bank</option>
            <option value="TopicQA">96 Topic Q&As</option>
          </select>
        </div>
      </div>

      {/* Main Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Question List */}
        <div className="lg:col-span-4 panel p-2.5 max-h-[68vh] overflow-y-auto space-y-1">
          <div className="px-2 py-1 text-[11px] text-[var(--text-muted)] font-medium">
            Showing {filteredQuestions.length} matching questions
          </div>
          {filteredQuestions.map((q, idx) => (
            <button
              key={q.id}
              type="button"
              onClick={() => setActiveIndex(idx)}
              className={`w-full text-left p-2.5 rounded-lg transition-colors cursor-pointer space-y-1 border ${
                idx === activeIndex
                  ? "bg-[var(--accent-soft)] border-sky-500/30"
                  : "border-transparent hover:bg-[var(--bg-hover)]"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-mono text-[var(--text-muted)]">
                  #{idx + 1} · {q.source}
                </span>
                <div className="flex items-center gap-1">
                  <Badge variant={difficultyVariant(q.difficulty)}>{q.difficulty}</Badge>
                  <Badge variant={statusVariant(q.attempt.status)}>{q.attempt.status}</Badge>
                </div>
              </div>
              <div className="text-xs font-medium line-clamp-2">{q.question}</div>
            </button>
          ))}
        </div>

        {/* Active Card */}
        <div className="lg:col-span-8 panel p-5 space-y-4">
          {!currentQ ? (
            <div className="py-12 text-center text-sm text-[var(--text-muted)]">
              No questions match your current filters.
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[var(--border-subtle)]">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="accent">
                    Question {activeIndex + 1} of {filteredQuestions.length}
                  </Badge>
                  <Badge variant={difficultyVariant(currentQ.difficulty)}>
                    {currentQ.difficulty}
                  </Badge>
                  <Badge variant="neutral">{currentQ.category}</Badge>
                  <Badge variant={statusVariant(currentQ.attempt.status)}>
                    {currentQ.attempt.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      updateAttempt(currentQ, { bookmarked: !currentQ.attempt.bookmarked })
                    }
                    className={`p-1.5 rounded-md border cursor-pointer ${
                      currentQ.attempt.bookmarked
                        ? "bg-[var(--accent-soft)] text-[var(--accent)] border-sky-500/30"
                        : "border-[var(--border-subtle)] text-[var(--text-muted)]"
                    }`}
                    title="Bookmark"
                  >
                    <Bookmark className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateAttempt(currentQ, { needsRevision: !currentQ.attempt.needsRevision })
                    }
                    className={`p-1.5 rounded-md border cursor-pointer ${
                      currentQ.attempt.needsRevision
                        ? "bg-[var(--warning-soft)] text-[var(--warning)] border-amber-500/30"
                        : "border-[var(--border-subtle)] text-[var(--text-muted)]"
                    }`}
                    title="Flag for spaced repetition"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <h2 className="text-base sm:text-lg font-semibold leading-snug">
                {currentQ.question}
              </h2>

              {/* Reveal Controls */}
              <div className="flex flex-wrap gap-2">
                {currentQ.hint && (
                  <button
                    type="button"
                    onClick={() => setShowHint((h) => !h)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] text-xs font-medium cursor-pointer"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-[var(--warning)]" />
                    {showHint ? "Hide Hint" : "Show Hint"}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowAnswer((a) => !a)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[var(--accent-strong)] text-white text-xs font-medium cursor-pointer hover:opacity-90"
                >
                  {showAnswer ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {showAnswer ? "Hide Answer" : "Reveal Official Answer"}
                </button>
              </div>

              {showHint && currentQ.hint && (
                <div className="p-3.5 rounded-lg bg-[var(--warning-soft)] border border-amber-500/30 text-xs">
                  <div className="font-semibold text-[var(--warning)] mb-1">Hint</div>
                  <MarkdownCode content={currentQ.hint} />
                </div>
              )}

              {showAnswer && (
                <div className="space-y-3 p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-strong)]">
                  <div>
                    <div className="text-xs font-semibold text-[var(--success)] mb-1">Answer</div>
                    <MarkdownCode content={currentQ.answer} />
                  </div>
                  {currentQ.explanation && (
                    <div className="pt-2 border-t border-[var(--border-subtle)]">
                      <div className="text-xs font-semibold text-[var(--accent)] mb-1">
                        Detailed Explanation & Example
                      </div>
                      <MarkdownCode content={currentQ.explanation} />
                    </div>
                  )}
                  {currentQ.followUp && (
                    <div className="pt-2 border-t border-[var(--border-subtle)] text-xs text-[var(--warning)]">
                      <strong>Interviewer Follow-Up:</strong> {currentQ.followUp}
                    </div>
                  )}
                </div>
              )}

              {/* Outcome Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[var(--border-subtle)]">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => updateAttempt(currentQ, { status: "Solved", needsRevision: false })}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--success-soft)] text-[var(--success)] border border-emerald-500/30 text-xs font-medium cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Mark Solved
                  </button>
                  <button
                    type="button"
                    onClick={() => updateAttempt(currentQ, { status: "Incorrect", needsRevision: true })}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--danger-soft)] text-[var(--danger)] border border-rose-500/30 text-xs font-medium cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Needs Revision (Incorrect)
                  </button>
                  <button
                    type="button"
                    onClick={() => updateAttempt(currentQ, { status: "Skipped" })}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs font-medium cursor-pointer"
                  >
                    <SkipForward className="w-3.5 h-3.5" /> Skip
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={activeIndex <= 0}
                    onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
                    className="px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] text-xs disabled:opacity-40 cursor-pointer"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={activeIndex >= filteredQuestions.length - 1}
                    onClick={() =>
                      setActiveIndex((i) => Math.min(filteredQuestions.length - 1, i + 1))
                    }
                    className="px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-strong)] text-xs disabled:opacity-40 cursor-pointer"
                  >
                    Next Question
                  </button>
                </div>
              </div>

              {/* Personal Notes */}
              <div className="pt-2 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--text-secondary)]">
                    Personal Question Note
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      await updateAttempt(currentQ, { notes: notesDraft });
                      setSavedNotice(true);
                      setTimeout(() => setSavedNotice(false), 1200);
                    }}
                    className="inline-flex items-center gap-1 text-xs text-[var(--accent)] hover:underline cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {savedNotice ? "Saved" : "Save Note"}
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  placeholder="Add mnemonic or edge case reminder..."
                  className="w-full p-2.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-xs outline-none focus:border-[var(--accent)]"
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
