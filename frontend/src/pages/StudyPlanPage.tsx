import React, { useEffect, useState } from "react";
import { CheckCircle2, CheckSquare, Square, Save } from "lucide-react";
import { api } from "../lib/api";
import type { StudyDay } from "../lib/types";
import { Badge } from "../components/Badge";

export const StudyPlanPage: React.FC = () => {
  const [days, setDays] = useState<StudyDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState("All");
  const [notesDraft, setNotesDraft] = useState<Record<number, string>>({});
  const [savedDay, setSavedDay] = useState<number | null>(null);

  useEffect(() => {
    api
      .studyPlan()
      .then((res) => {
        setDays(res.days);
        const init: Record<number, string> = {};
        res.days.forEach((d) => {
          init[d.day] = d.progress.notes || "";
        });
        setNotesDraft(init);
      })
      .finally(() => setLoading(false));
  }, []);

  const updateDay = async (
    dayNum: number,
    payload: { completed?: boolean; completedTasksJson?: string; notes?: string }
  ) => {
    const res = (await api.updateStudyDay(dayNum, payload)) as {
      progress: StudyDay["progress"];
    };
    setDays((prev) =>
      prev.map((d) => (d.day === dayNum ? { ...d, progress: res.progress } : d))
    );
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-12 text-center text-sm text-[var(--text-muted)]">
        Loading 30-day preparation roadmap...
      </div>
    );
  }

  const weeks = ["All", ...Array.from(new Set(days.map((d) => d.week)))];
  const visibleDays = days.filter((d) => selectedWeek === "All" || d.week === selectedWeek);
  const completedDays = days.filter((d) => d.progress.completed).length;

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">30-Day Placement Preparation Plan</h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Daily structured schedule covering all 32 topics, 51 coding challenges, 52 output puzzles, and 10 mock rounds.
          </p>
        </div>
        <Badge variant="success">
          {completedDays} / {days.length} Days Completed
        </Badge>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {weeks.map((w) => (
          <button
            key={w}
            type="button"
            onClick={() => setSelectedWeek(w)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer ${
              selectedWeek === w
                ? "bg-[var(--accent-soft)] text-[var(--accent)] border-sky-500/30"
                : "bg-[var(--bg-secondary)] border-[var(--border-subtle)] text-[var(--text-secondary)]"
            }`}
          >
            {w}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visibleDays.map((day) => {
          const taskState: Record<string, boolean> = (() => {
            try {
              return JSON.parse(day.progress.completedTasksJson || "{}") as Record<string, boolean>;
            } catch {
              return {};
            }
          })();

          const toggleTask = (taskId: string) => {
            const next = { ...taskState, [taskId]: !taskState[taskId] };
            const allDone =
              day.tasks.length > 0 && day.tasks.every((t) => next[t.id]);
            updateDay(day.day, {
              completedTasksJson: JSON.stringify(next),
              completed: allDone,
            });
          };

          return (
            <div key={day.day} className="panel p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="accent">Day {day.day}</Badge>
                    <span className="text-[11px] text-[var(--text-muted)]">{day.week}</span>
                  </div>
                  <h2 className="text-sm font-semibold mt-1">{day.summary}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => updateDay(day.day, { completed: !day.progress.completed })}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs border cursor-pointer shrink-0 ${
                    day.progress.completed
                      ? "bg-[var(--success-soft)] text-[var(--success)] border-emerald-500/30"
                      : "border-[var(--border-subtle)] text-[var(--text-secondary)]"
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {day.progress.completed ? "Done" : "Complete"}
                </button>
              </div>

              <div className="space-y-1.5">
                {day.tasks.map((t) => {
                  const checked = !!taskState[t.id];
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => toggleTask(t.id)}
                      className="w-full flex items-start gap-2 text-left text-xs p-1.5 rounded hover:bg-[var(--bg-hover)] cursor-pointer"
                    >
                      {checked ? (
                        <CheckSquare className="w-4 h-4 text-[var(--success)] shrink-0 mt-0.5" />
                      ) : (
                        <Square className="w-4 h-4 text-[var(--text-muted)] shrink-0 mt-0.5" />
                      )}
                      <span className={checked ? "line-through text-[var(--text-muted)]" : ""}>
                        {t.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 pt-1 border-t border-[var(--border-subtle)]">
                <input
                  value={notesDraft[day.day] ?? ""}
                  onChange={(e) =>
                    setNotesDraft((n) => ({ ...n, [day.day]: e.target.value }))
                  }
                  placeholder={`Day ${day.day} reflection or weak spots...`}
                  className="flex-1 px-2.5 py-1 rounded-md bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-xs outline-none"
                />
                <button
                  type="button"
                  onClick={async () => {
                    await updateDay(day.day, { notes: notesDraft[day.day] ?? "" });
                    setSavedDay(day.day);
                    setTimeout(() => setSavedDay(null), 1200);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  {savedDay === day.day ? "Saved" : "Save"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
