import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, RotateCcw, Bookmark, ArrowRight } from "lucide-react";
import { api } from "../lib/api";
import { Badge } from "../components/Badge";

const INTERVAL_LABELS = ["Unscheduled", "Next: 1 Day", "Next: 3 Days", "Next: 7 Days", "Mastered (14d)"];

export const RevisionCenterPage: React.FC = () => {
  const [data, setData] = useState<Awaited<ReturnType<typeof api.revisions>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | "topics" | "questions" | "outputs" | "coding">("all");

  const load = () => {
    api
      .revisions()
      .then(setData)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleComplete = async (kind: "topic" | "question" | "output" | "coding", id: string) => {
    await api.completeRevision(kind, id);
    load();
  };

  if (loading || !data) {
    return (
      <div className="max-w-6xl mx-auto py-12 text-center text-sm text-[var(--text-muted)]">
        Loading spaced repetition queue...
      </div>
    );
  }

  const totalItems =
    data.topics.length + data.questions.length + data.outputs.length + data.coding.length;

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Spaced Repetition & Revision Center</h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Automatically tracks incorrect items, revision-flagged items, bookmarks, and notes across a 1d → 3d → 7d → 14d cycle.
          </p>
        </div>
        <Badge variant={totalItems > 0 ? "warning" : "success"}>
          {totalItems} Items in Queue
        </Badge>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(
          [
            ["all", `All (${totalItems})`],
            ["topics", `Topics (${data.topics.length})`],
            ["questions", `Theory (${data.questions.length})`],
            ["outputs", `Outputs (${data.outputs.length})`],
            ["coding", `Coding (${data.coding.length})`],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer ${
              tab === k
                ? "bg-[var(--accent-soft)] text-[var(--accent)] border-sky-500/30"
                : "bg-[var(--bg-secondary)] border-[var(--border-subtle)] text-[var(--text-secondary)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {totalItems === 0 ? (
        <div className="panel p-8 text-center space-y-2">
          <RotateCcw className="w-8 h-8 text-[var(--success)] mx-auto" />
          <div className="text-sm font-semibold">Revision Queue Clear</div>
          <p className="text-xs text-[var(--text-muted)]">
            Bookmark topics, miss an output puzzle, or flag hard interview questions to build your personalized revision deck.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {(tab === "all" || tab === "topics") && data.topics.length > 0 && (
            <div className="panel p-4 space-y-2.5">
              <h2 className="text-sm font-semibold">Topics ({data.topics.length})</h2>
              {data.topics.map((t) => (
                <RevisionRow
                  key={t.topicId}
                  title={t.meta?.title || t.topicId}
                  sub={t.notes || `Status: ${t.status}`}
                  bookmarked={t.bookmarked}
                  needsRevision={t.needsRevision}
                  to={`/topics/${t.topicId}`}
                  onComplete={() => handleComplete("topic", t.topicId)}
                />
              ))}
            </div>
          )}

          {(tab === "all" || tab === "questions") && data.questions.length > 0 && (
            <div className="panel p-4 space-y-2.5">
              <h2 className="text-sm font-semibold">Theory Questions ({data.questions.length})</h2>
              {data.questions.map((q) => (
                <RevisionRow
                  key={q.questionId}
                  title={q.meta?.question || q.questionId}
                  sub={`${INTERVAL_LABELS[q.revisionStage] || ""} ${q.notes ? `· Note: ${q.notes}` : ""}`}
                  bookmarked={q.bookmarked}
                  needsRevision={q.needsRevision}
                  to={`/theory?topic=${q.meta?.topicId || ""}`}
                  onComplete={() => handleComplete("question", q.questionId)}
                />
              ))}
            </div>
          )}

          {(tab === "all" || tab === "outputs") && data.outputs.length > 0 && (
            <div className="panel p-4 space-y-2.5">
              <h2 className="text-sm font-semibold">Output Puzzles ({data.outputs.length})</h2>
              {data.outputs.map((o) => (
                <RevisionRow
                  key={o.puzzleId}
                  title={o.meta?.title || o.puzzleId}
                  sub={`${INTERVAL_LABELS[o.revisionStage] || ""} ${o.notes ? `· Note: ${o.notes}` : ""}`}
                  bookmarked={o.bookmarked}
                  needsRevision={o.needsRevision}
                  to={`/outputs?id=${o.puzzleId}`}
                  onComplete={() => handleComplete("output", o.puzzleId)}
                />
              ))}
            </div>
          )}

          {(tab === "all" || tab === "coding") && data.coding.length > 0 && (
            <div className="panel p-4 space-y-2.5">
              <h2 className="text-sm font-semibold">Coding Problems ({data.coding.length})</h2>
              {data.coding.map((c) => (
                <RevisionRow
                  key={c.problemId}
                  title={c.meta?.title || c.problemId}
                  sub={c.notes || (c.solved ? "Solved — flagged for review" : "Bookmarked")}
                  bookmarked={c.bookmarked}
                  needsRevision={c.needsRevision}
                  to={`/coding?id=${c.problemId}`}
                  onComplete={() => handleComplete("coding", c.problemId)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const RevisionRow: React.FC<{
  title: string;
  sub: string;
  bookmarked: boolean;
  needsRevision: boolean;
  to: string;
  onComplete: () => void;
}> = ({ title, sub, bookmarked, needsRevision, to, onComplete }) => (
  <div className="p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
    <div className="min-w-0 space-y-0.5">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold truncate">{title}</span>
        {bookmarked && <Bookmark className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />}
        {needsRevision && <Badge variant="warning">Due</Badge>}
      </div>
      <div className="text-[11px] text-[var(--text-muted)] truncate">{sub}</div>
    </div>
    <div className="flex items-center gap-2 shrink-0">
      <Link
        to={to}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-[var(--border-subtle)] text-xs hover:bg-[var(--bg-hover)]"
      >
        Open <ArrowRight className="w-3 h-3" />
      </Link>
      {needsRevision && (
        <button
          type="button"
          onClick={onComplete}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[var(--success-soft)] text-[var(--success)] border border-emerald-500/30 text-xs cursor-pointer"
        >
          <CheckCircle2 className="w-3.5 h-3.5" /> Complete Cycle
        </button>
      )}
    </div>
  </div>
);
