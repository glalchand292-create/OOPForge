import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Flame,
  Clock,
  CheckCircle2,
  Code2,
  Terminal,
  BookOpen,
  RotateCcw,
  ArrowRight,
  AlertTriangle,
  CalendarDays,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { api } from "../lib/api";
import type { DashboardData } from "../lib/types";
import { Badge, statusVariant } from "../components/Badge";

export const DashboardPage: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .dashboard()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-12 text-center text-sm text-[var(--text-muted)]">
        Loading OOPForge analytics...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-7xl mx-auto py-12 text-center text-sm text-[var(--danger)]">
        Failed to connect to OOPForge backend on port 4000.
      </div>
    );
  }

  const { stats, profile, studyActivity, chapters, recentlyStudiedTopics, weakestTopics, recentMocks } =
    data;

  const totalHours = (stats.totalStudySeconds / 3600).toFixed(1);
  const targetPct = Math.min(
    100,
    Math.round((stats.todayMinutes / Math.max(1, stats.dailyTargetMinutes)) * 100)
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            Welcome back, {profile.displayName}
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5">
            Learn OOP. Practice C++. Master Interviews. — ISO C++17 Study Dashboard
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/roadmap"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[var(--accent-strong)] text-white text-xs font-medium hover:opacity-90 transition-opacity"
          >
            Continue Roadmap <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            to="/coding"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-secondary)] text-xs font-medium hover:bg-[var(--bg-hover)]"
          >
            Open Coding Arena
          </Link>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard
          label="Overall Mastery"
          value={`${stats.overallCompletionPct}%`}
          sub={`${stats.topicsCompleted}/${stats.totalTopics} topics completed`}
          icon={CheckCircle2}
          accent="var(--accent)"
        />
        <StatCard
          label="Theory & Questions"
          value={`${stats.questionsSolved}/${stats.totalQuestions}`}
          sub="Interview questions solved"
          icon={BookOpen}
          accent="var(--success)"
        />
        <StatCard
          label="C++17 Coding & Output"
          value={`${stats.codingSolved}/${stats.totalCoding} · ${stats.outputsCorrect}/${stats.totalOutputs}`}
          sub="Coding solved · Output puzzles correct"
          icon={Code2}
          accent="var(--warning)"
        />
        <StatCard
          label="Streak & Study Time"
          value={`${stats.streakCount}d · ${totalHours}h`}
          sub={`Today: ${stats.todayMinutes}/${stats.dailyTargetMinutes} min (${targetPct}%)`}
          icon={Flame}
          accent="var(--danger)"
        />
      </div>

      {/* Daily Goal Progress Bar */}
      <div className="panel p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold">Daily Study Target</div>
            <div className="text-xs text-[var(--text-secondary)]">
              {stats.todayMinutes} of {stats.dailyTargetMinutes} minutes logged today ·{" "}
              {stats.planDaysCompleted}/{stats.totalPlanDays} study plan days finished ·{" "}
              {stats.designsCompleted}/{stats.totalDesigns} OOP designs completed
            </div>
          </div>
        </div>
        <div className="w-full sm:w-64">
          <div className="h-2 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
            <div
              className="h-full bg-[var(--accent)] transition-all"
              style={{ width: `${targetPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Charts + Chapters */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="panel p-4 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold">Last 7 Days Study Activity</h2>
              <p className="text-xs text-[var(--text-muted)]">Minutes tracked across OOPForge modules</p>
            </div>
            <Badge variant="accent">Live SQLite Log</Badge>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={studyActivity}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="date" tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
                <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--bg-secondary)",
                    borderColor: "var(--border-strong)",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="minutes" fill="#38bdf8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Chapter Progress</h2>
            <Link to="/roadmap" className="text-xs text-[var(--accent)] hover:underline">
              View All
            </Link>
          </div>
          <div className="space-y-3.5">
            {chapters.map((ch) => {
              const pct = ch.total > 0 ? Math.round((ch.completed / ch.total) * 100) : 0;
              return (
                <div key={ch.chapterId} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium truncate pr-2">
                      Ch {ch.chapterId}: {ch.title}
                    </span>
                    <span className="text-[var(--text-muted)] shrink-0">
                      {ch.completed}/{ch.total} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
                    <div
                      className="h-full bg-[var(--success)] transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
              <RotateCcw className="w-3.5 h-3.5 text-[var(--warning)]" />
              <span>Pending Revisions</span>
            </div>
            <Link to="/revisions">
              <Badge variant={stats.pendingRevisionsCount > 0 ? "warning" : "neutral"}>
                {stats.pendingRevisionsCount} due
              </Badge>
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom 3-Column Action Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="panel p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Recently Studied Topics</h2>
            <Link to="/roadmap" className="text-xs text-[var(--accent)] hover:underline">
              Roadmap
            </Link>
          </div>
          {recentlyStudiedTopics.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] py-4">
              No topics studied yet. Open any topic in the Learning Roadmap to begin.
            </p>
          ) : (
            <div className="space-y-2">
              {recentlyStudiedTopics.map((item) => (
                <Link
                  key={item.topicId}
                  to={`/topics/${item.topicId}`}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] transition-colors"
                >
                  <span className="text-xs font-medium truncate pr-2">{item.title}</span>
                  <Badge variant={statusVariant(item.status)}>{item.status}</Badge>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="panel p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-[var(--warning)]" />
              Weakest & Revision Topics
            </h2>
            <Link to="/revisions" className="text-xs text-[var(--accent)] hover:underline">
              Revision Queue
            </Link>
          </div>
          {weakestTopics.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] py-4">
              No weak spots flagged yet. Incorrect answers and topics marked for revision appear here.
            </p>
          ) : (
            <div className="space-y-2">
              {weakestTopics.map((w) => (
                <Link
                  key={w.topicId}
                  to={`/topics/${w.topicId}`}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] transition-colors"
                >
                  <span className="text-xs font-medium truncate pr-2">{w.title}</span>
                  <Badge variant="danger">{w.incorrectCount} misses</Badge>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="panel p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Recent Mock Interviews</h2>
            <Link to="/mocks" className="text-xs text-[var(--accent)] hover:underline">
              Start Mock
            </Link>
          </div>
          {recentMocks.length === 0 ? (
            <div className="py-4 space-y-3">
              <p className="text-xs text-[var(--text-muted)]">
                No mock rounds completed yet. Test yourself across 10 timed interview rounds.
              </p>
              <div className="flex gap-2">
                <Link
                  to="/outputs"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-[var(--bg-elevated)] text-xs hover:bg-[var(--bg-hover)]"
                >
                  <Terminal className="w-3.5 h-3.5" /> Output Arena
                </Link>
                <Link
                  to="/study-plan"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-[var(--bg-elevated)] text-xs hover:bg-[var(--bg-hover)]"
                >
                  <CalendarDays className="w-3.5 h-3.5" /> 30-Day Plan
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {recentMocks.slice(0, 5).map((m) => (
                <Link
                  key={m.id}
                  to="/mocks"
                  className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] transition-colors"
                >
                  <span className="text-xs font-medium">Mock Round {m.roundNumber}</span>
                  <Badge variant={m.score >= 70 ? "success" : "warning"}>
                    {m.score}/{m.maxScore}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{
  label: string;
  value: string;
  sub: string;
  icon: React.FC<{ className?: string; style?: React.CSSProperties }>;
  accent: string;
}> = ({ label, value, sub, icon: Icon, accent }) => (
  <div className="panel p-4 space-y-2">
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium text-[var(--text-secondary)]">{label}</span>
      <Icon className="w-4 h-4" style={{ color: accent }} />
    </div>
    <div className="text-xl sm:text-2xl font-bold tracking-tight">{value}</div>
    <div className="text-[11px] text-[var(--text-muted)] truncate">{sub}</div>
  </div>
);
