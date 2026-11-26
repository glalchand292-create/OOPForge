import React, { useEffect, useState } from "react";
import {
  Timer,
  Play,
  Flag,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Send,
  Award,
} from "lucide-react";
import { api, GradedMockQuestion } from "../lib/api";
import type { MockAttempt, MockRoundDetail, MockRoundSummary } from "../lib/types";
import { Badge, difficultyVariant } from "../components/Badge";
import { CodeBlock, MarkdownCode } from "../components/MarkdownCode";

export const MockInterviewsPage: React.FC = () => {
  const [rounds, setRounds] = useState<MockRoundSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeRound, setActiveRound] = useState<MockRoundDetail | null>(null);
  const [qIndex, setQIndex] = useState(0);
  const [responses, setResponses] = useState<Record<number, string>>({});
  const [flagged, setFlagged] = useState<Record<number, boolean>>({});
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const [submittedResult, setSubmittedResult] = useState<{
    attempt: MockAttempt;
    gradedQuestions: GradedMockQuestion[];
    topicBreakdown: Record<string, { earned: number; max: number }>;
  } | null>(null);
  const [scoreOverrides, setScoreOverrides] = useState<Record<string, number>>({});
  const [savingScores, setSavingScores] = useState(false);

  const loadRounds = () => {
    api
      .mocks()
      .then((res) => setRounds(res.rounds))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadRounds();
  }, []);

  // Live timer while mock interview is active and unsubmitted
  useEffect(() => {
    if (!activeRound || submittedResult) return;
    const interval = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
      setElapsedSeconds((e) => e + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeRound, submittedResult]);

  const startRound = async (id: string) => {
    const res = await api.mockDetail(id);
    setActiveRound(res.round);
    setQIndex(0);
    setResponses({});
    setFlagged({});
    setSecondsLeft(res.round.durationMinutes * 60);
    setElapsedSeconds(0);
    setSubmittedResult(null);
    setScoreOverrides({});
  };

  const handleSubmit = async () => {
    if (!activeRound) return;
    const answers = activeRound.questions.map((q) => ({
      number: q.number,
      response: responses[q.number] || "",
      markedForReview: !!flagged[q.number],
    }));
    const res = await api.submitMock(activeRound.id, {
      durationSeconds: elapsedSeconds,
      answers,
    });
    setSubmittedResult(res);
    const initialScores: Record<string, number> = {};
    res.gradedQuestions.forEach((gq) => {
      initialScores[String(gq.number)] = gq.earnedScore;
    });
    setScoreOverrides(initialScores);
    loadRounds();
  };

  const handleSaveScores = async () => {
    if (!submittedResult) return;
    setSavingScores(true);
    try {
      const updated = await api.updateMockScores(submittedResult.attempt.id, scoreOverrides);
      setSubmittedResult(updated);
      loadRounds();
    } finally {
      setSavingScores(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-12 text-center text-sm text-[var(--text-muted)]">
        Loading 10 full-length C++ OOP mock interviews...
      </div>
    );
  }

  // Review Results Screen (Answer Keys unlocked strictly AFTER submit)
  if (activeRound && submittedResult) {
    return (
      <div className="max-w-6xl mx-auto space-y-5">
        <div className="panel p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="success">Submitted</Badge>
              <span className="text-xs text-[var(--text-muted)]">
                Duration: {Math.floor(submittedResult.attempt.durationSeconds / 60)}m{" "}
                {submittedResult.attempt.durationSeconds % 60}s
              </span>
            </div>
            <h1 className="text-xl font-bold mt-1">
              Round {activeRound.roundNumber}: {activeRound.title} — Evaluation & Answer Key
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs text-[var(--text-muted)]">Total Score</div>
              <div className="text-2xl font-bold text-[var(--accent)]">
                {submittedResult.attempt.score} / {submittedResult.attempt.maxScore}
              </div>
            </div>
            <button
              type="button"
              onClick={handleSaveScores}
              disabled={savingScores}
              className="px-3.5 py-2 rounded-lg bg-[var(--success)] text-slate-950 text-xs font-semibold cursor-pointer"
            >
              {savingScores ? "Saving..." : "Save Rubric Scores"}
            </button>
            <button
              type="button"
              onClick={() => setActiveRound(null)}
              className="px-3 py-2 rounded-lg border border-[var(--border-subtle)] text-xs cursor-pointer"
            >
              All Rounds
            </button>
          </div>
        </div>

        {/* Type Breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(submittedResult.topicBreakdown).map(([type, info]) => (
            <div key={type} className="panel p-3.5">
              <div className="text-xs text-[var(--text-muted)]">{type} Questions</div>
              <div className="text-lg font-bold mt-0.5">
                {info.earned} / {info.max}
              </div>
            </div>
          ))}
        </div>

        {/* Question-by-Question Official Answer Keys */}
        <div className="space-y-4">
          {submittedResult.gradedQuestions.map((gq) => (
            <div key={gq.number} className="panel p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant="accent">Q{gq.number}</Badge>
                  <Badge variant="neutral">{gq.type}</Badge>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-[var(--text-muted)]">Self-Score (0–10):</span>
                  <input
                    type="range"
                    min={0}
                    max={10}
                    value={scoreOverrides[String(gq.number)] ?? gq.earnedScore}
                    onChange={(e) =>
                      setScoreOverrides((prev) => ({
                        ...prev,
                        [String(gq.number)]: Number(e.target.value),
                      }))
                    }
                  />
                  <span className="font-mono font-bold w-6 text-right">
                    {scoreOverrides[String(gq.number)] ?? gq.earnedScore}
                  </span>
                </div>
              </div>

              <MarkdownCode content={gq.prompt} />
              {gq.code && <CodeBlock code={gq.code} lang="cpp" />}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
                  <div className="text-[11px] font-semibold text-[var(--text-muted)] mb-1">
                    Your Submitted Answer
                  </div>
                  <pre className="text-xs whitespace-pre-wrap font-sans text-[var(--text-secondary)]">
                    {gq.userResponse || "(Left blank)"}
                  </pre>
                </div>
                <div className="p-3 rounded-lg bg-[var(--bg-elevated)] border border-emerald-500/30">
                  <div className="text-[11px] font-semibold text-[var(--success)] mb-1">
                    Unlocked Official Answer Key
                  </div>
                  <MarkdownCode content={gq.answerKey} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Active Timed Mock Test Runner
  if (activeRound) {
    const q = activeRound.questions[qIndex];
    const mins = Math.floor(secondsLeft / 60);
    const secs = secondsLeft % 60;

    return (
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="panel px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-bold">
              Mock Round {activeRound.roundNumber}: {activeRound.title}
            </div>
            <div className="text-xs text-[var(--text-muted)]">
              Answer keys stay locked until you submit the interview round.
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant={secondsLeft < 300 ? "danger" : "accent"}>
              <Timer className="w-3.5 h-3.5" />
              {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
            </Badge>
            <button
              type="button"
              onClick={handleSubmit}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[var(--success)] text-slate-950 text-xs font-semibold cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" /> Submit Interview
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Palette */}
          <div className="lg:col-span-3 panel p-4 space-y-3 h-fit">
            <div className="text-xs font-semibold">Question Palette</div>
            <div className="grid grid-cols-5 gap-2">
              {activeRound.questions.map((item, idx) => {
                const answered = (responses[item.number] || "").trim().length > 0;
                const isFlagged = !!flagged[item.number];
                return (
                  <button
                    key={item.number}
                    type="button"
                    onClick={() => setQIndex(idx)}
                    className={`h-9 rounded-lg text-xs font-mono font-semibold border cursor-pointer ${
                      idx === qIndex
                        ? "bg-[var(--accent-strong)] text-white border-sky-400"
                        : isFlagged
                        ? "bg-[var(--warning-soft)] text-[var(--warning)] border-amber-500/40"
                        : answered
                        ? "bg-[var(--success-soft)] text-[var(--success)] border-emerald-500/30"
                        : "bg-[var(--bg-elevated)] border-[var(--border-subtle)]"
                    }`}
                  >
                    {item.number}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setActiveRound(null)}
              className="w-full py-1.5 rounded-lg border border-[var(--border-subtle)] text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              Exit Round
            </button>
          </div>

          {/* Question Runner */}
          <div className="lg:col-span-9 panel p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div className="flex items-center gap-2">
                <Badge variant="accent">
                  Question {q.number} / {activeRound.questions.length}
                </Badge>
                <Badge variant="neutral">{q.type}</Badge>
              </div>
              <button
                type="button"
                onClick={() =>
                  setFlagged((f) => ({ ...f, [q.number]: !f[q.number] }))
                }
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs border cursor-pointer ${
                  flagged[q.number]
                    ? "bg-[var(--warning-soft)] text-[var(--warning)] border-amber-500/30"
                    : "border-[var(--border-subtle)] text-[var(--text-secondary)]"
                }`}
              >
                <Flag className="w-3.5 h-3.5" />
                {flagged[q.number] ? "Flagged" : "Mark for Review"}
              </button>
            </div>

            <MarkdownCode content={q.prompt} />
            {q.code && <CodeBlock code={q.code} lang="cpp" />}

            <div className="space-y-1.5">
              <div className="text-xs font-semibold text-[var(--text-secondary)]">
                Your Response {q.type === "Coding" || q.type === "Design" ? "(Code / Architecture)" : ""}
              </div>
              <textarea
                rows={q.type === "Output" ? 3 : 8}
                value={responses[q.number] || ""}
                onChange={(e) =>
                  setResponses((prev) => ({ ...prev, [q.number]: e.target.value }))
                }
                placeholder={
                  q.type === "Output"
                    ? "Type exact expected output or Undefined Behavior / Compile Error..."
                    : "Write a clear interview explanation or C++17 code..."
                }
                className="w-full p-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-xs font-mono outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                disabled={qIndex === 0}
                onClick={() => setQIndex((i) => Math.max(0, i - 1))}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] text-xs disabled:opacity-40 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Previous
              </button>
              <button
                type="button"
                disabled={qIndex >= activeRound.questions.length - 1}
                onClick={() =>
                  setQIndex((i) => Math.min(activeRound.questions.length - 1, i + 1))
                }
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--accent-strong)] text-white text-xs disabled:opacity-40 cursor-pointer"
              >
                Next <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Rounds Overview List
  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Mock Interview Arena (10 Timed Rounds)</h1>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
          100 curated questions simulating college placements, product startups, and SDE-1 C++ technical rounds.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rounds.map((r) => {
          const best = r.attempts.reduce((max, a) => Math.max(max, a.score), -1);
          return (
            <div key={r.id} className="panel p-4 flex flex-col justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="accent">Mock Round {r.roundNumber}</Badge>
                  <div className="flex items-center gap-1.5">
                    <Badge variant={difficultyVariant(r.difficulty)}>{r.difficulty}</Badge>
                    {best >= 0 && (
                      <Badge variant="success">
                        <Award className="w-3 h-3" /> Best: {best}/100
                      </Badge>
                    )}
                  </div>
                </div>
                <h2 className="text-base font-bold">{r.title}</h2>
                <div className="text-xs text-[var(--text-muted)]">
                  {r.questionCount} questions · {r.durationMinutes} min timer · Answer keys locked until submit
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]">
                <span className="text-xs text-[var(--text-muted)]">
                  {r.attempts.length} attempt{r.attempts.length === 1 ? "" : "s"}
                </span>
                <button
                  type="button"
                  onClick={() => startRound(r.id)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[var(--accent-strong)] text-white text-xs font-medium hover:opacity-90 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" />
                  {r.attempts.length > 0 ? "Retake Round" : "Start Interview"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
