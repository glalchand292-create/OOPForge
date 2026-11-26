import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronDown,
  ChevronRight,
  Bookmark,
  RotateCcw,
  BookOpen,
  Code2,
  Terminal,
  GitCompare,
  ArrowRight,
} from "lucide-react";
import { api } from "../lib/api";
import type { TopicItem, TopicProgress } from "../lib/types";
import { Badge, difficultyVariant, statusVariant } from "../components/Badge";

const STATUS_OPTIONS: TopicProgress["status"][] = [
  "Not Started",
  "In Progress",
  "Completed",
  "Needs Revision",
];

export const RoadmapPage: React.FC = () => {
  const [topics, setTopics] = useState<TopicItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openChapters, setOpenChapters] = useState<Record<number, boolean>>({ 1: true, 2: true, 3: true });
  const [filterStatus, setFilterStatus] = useState("All");
  const [search, setSearch] = useState("");

  useEffect(() => {
    api
      .topics()
      .then((res) => setTopics(res.topics))
      .finally(() => setLoading(false));
  }, []);

  const handleStatusChange = async (topicId: string, status: TopicProgress["status"]) => {
    const res = await api.updateTopicProgress(topicId, {
      status,
      needsRevision: status === "Needs Revision",
    });
    setTopics((prev) =>
      prev.map((t) => (t.id === topicId ? { ...t, progress: res.progress } : t))
    );
  };

  const handleToggleFlag = async (
    topic: TopicItem,
    field: "bookmarked" | "needsRevision"
  ) => {
    const nextVal = !topic.progress[field];
    const res = await api.updateTopicProgress(topic.id, { [field]: nextVal });
    setTopics((prev) =>
      prev.map((t) => (t.id === topic.id ? { ...t, progress: res.progress } : t))
    );
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-12 text-center text-sm text-[var(--text-muted)]">
        Loading 32-topic C++ OOP syllabus...
      </div>
    );
  }

  const completedCount = topics.filter((t) => t.progress.status === "Completed").length;
  const pct = topics.length ? Math.round((completedCount / topics.length) * 100) : 0;

  const filtered = topics.filter((t) => {
    if (filterStatus !== "All" && t.progress.status !== filterStatus) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        t.title.toLowerCase().includes(q) ||
        t.chapterTitle.toLowerCase().includes(q) ||
        t.simpleExplanation.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const chapters = [1, 2, 3].map((cid) => ({
    id: cid,
    title: topics.find((t) => t.chapterId === cid)?.chapterTitle || `Chapter ${cid}`,
    items: filtered.filter((t) => t.chapterId === cid),
    allItems: topics.filter((t) => t.chapterId === cid),
  }));

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Striver-Style C++ OOP Learning Roadmap</h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Complete 32-topic syllabus organized across 3 progressive chapters with cross-linked theory, code, and output practice.
          </p>
        </div>
        <div className="panel px-4 py-2.5 flex items-center gap-4">
          <div>
            <div className="text-[11px] text-[var(--text-muted)]">Syllabus Completed</div>
            <div className="text-sm font-bold">
              {completedCount} / {topics.length} ({pct}%)
            </div>
          </div>
          <div className="w-28 h-2 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
            <div className="h-full bg-[var(--success)]" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="panel p-3.5 flex flex-wrap items-center justify-between gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter topics by keyword..."
          className="px-3 py-1.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-xs w-full sm:w-72 outline-none focus:border-[var(--accent)]"
        />
        <div className="flex flex-wrap gap-1.5">
          {["All", ...STATUS_OPTIONS].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFilterStatus(st)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer border ${
                filterStatus === st
                  ? "bg-[var(--accent-soft)] text-[var(--accent)] border-sky-500/30"
                  : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--border-subtle)]"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Expandable Chapters */}
      <div className="space-y-4">
        {chapters.map((ch) => {
          const isOpen = !!openChapters[ch.id];
          const chDone = ch.allItems.filter((i) => i.progress.status === "Completed").length;
          return (
            <div key={ch.id} className="panel overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenChapters((p) => ({ ...p, [ch.id]: !p[ch.id] }))}
                className="w-full px-4 py-3.5 flex items-center justify-between bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-2.5">
                  {isOpen ? (
                    <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
                  )}
                  <div>
                    <div className="text-sm font-semibold">
                      Chapter {ch.id}: {ch.title}
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)]">
                      {chDone} of {ch.allItems.length} topics completed
                    </div>
                  </div>
                </div>
                <Badge variant={chDone === ch.allItems.length ? "success" : "accent"}>
                  {chDone}/{ch.allItems.length}
                </Badge>
              </button>

              {isOpen && (
                <div className="divide-y divide-[var(--border-subtle)]">
                  {ch.items.length === 0 ? (
                    <div className="p-4 text-xs text-[var(--text-muted)]">
                      No topics match current filter in this chapter.
                    </div>
                  ) : (
                    ch.items.map((t) => (
                      <div
                        key={t.id}
                        className="px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-[var(--bg-hover)]/40 transition-colors"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <span className="text-xs font-mono text-[var(--text-muted)] pt-0.5 w-7 shrink-0">
                            #{String(t.number).padStart(2, "0")}
                          </span>
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Link
                                to={`/topics/${t.id}`}
                                className="text-sm font-semibold hover:text-[var(--accent)] transition-colors"
                              >
                                {t.title}
                              </Link>
                              <Badge variant={difficultyVariant(t.difficulty)}>{t.difficulty}</Badge>
                              <Badge variant={statusVariant(t.progress.status)}>
                                {t.progress.status}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-[11px] text-[var(--text-muted)]">
                              <span className="inline-flex items-center gap-1">
                                <BookOpen className="w-3 h-3" /> {t.questions.length + t.relatedTheoryIds.length} Theory Qs
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Code2 className="w-3 h-3" /> {t.relatedCodingIds.length} Coding
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Terminal className="w-3 h-3" /> {t.relatedOutputIds.length} Output
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <GitCompare className="w-3 h-3" /> {t.relatedComparisonIds.length} Tables
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <select
                            value={t.progress.status}
                            onChange={(e) =>
                              handleStatusChange(t.id, e.target.value as TopicProgress["status"])
                            }
                            className="px-2 py-1 rounded-md bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-xs outline-none cursor-pointer"
                          >
                            {STATUS_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            onClick={() => handleToggleFlag(t, "bookmarked")}
                            title="Bookmark topic"
                            className={`p-1.5 rounded-md border cursor-pointer ${
                              t.progress.bookmarked
                                ? "bg-[var(--accent-soft)] text-[var(--accent)] border-sky-500/30"
                                : "border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                            }`}
                          >
                            <Bookmark className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleFlag(t, "needsRevision")}
                            title="Flag for revision"
                            className={`p-1.5 rounded-md border cursor-pointer ${
                              t.progress.needsRevision
                                ? "bg-[var(--warning-soft)] text-[var(--warning)] border-amber-500/30"
                                : "border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                            }`}
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>

                          <Link
                            to={`/topics/${t.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-[var(--accent-strong)] text-white text-xs font-medium hover:opacity-90"
                          >
                            Study <ArrowRight className="w-3 h-3" />
                          </Link>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
