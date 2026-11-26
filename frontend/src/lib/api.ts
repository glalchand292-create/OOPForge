import type {
  CodingProblem,
  CodingStatus,
  CodingSubmission,
  ComparisonItem,
  DashboardData,
  DesignProblem,
  MockAttempt,
  MockRoundDetail,
  MockRoundSummary,
  OutputAttempt,
  OutputPuzzle,
  SandboxExecutionResult,
  SolidAndModernContent,
  SolidModuleProgress,
  StudyDay,
  TheoryQuestion,
  TopicItem,
  TopicProgress,
  UserProfile,
} from "./types";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(body || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export interface SearchResult {
  type: "Topic" | "Question" | "Coding" | "Output" | "Comparison" | "Design";
  id: string;
  title: string;
  subtitle: string;
  route: string;
}

export interface GradedMockQuestion {
  number: number;
  type: "Theory" | "Output" | "Coding" | "Design";
  prompt: string;
  code: string;
  userResponse: string;
  earnedScore: number;
  answerKey: string;
}

export const api = {
  health: () =>
    request<{ ok: boolean; compilerAvailable: boolean; compilerName: string }>("/api/health"),

  search: (q: string) =>
    request<{ results: SearchResult[] }>(`/api/search?q=${encodeURIComponent(q)}`),

  dashboard: () => request<DashboardData>("/api/dashboard"),

  logStudyTime: (seconds: number, module: string) =>
    request<{ ok: boolean }>("/api/study-time", {
      method: "POST",
      body: JSON.stringify({ seconds, module }),
    }),

  topics: () => request<{ topics: TopicItem[] }>("/api/topics"),

  topicDetail: (id: string) =>
    request<{
      topic: TopicItem;
      progress: TopicProgress;
      relatedCoding: CodingProblem[];
      relatedOutputs: OutputPuzzle[];
      relatedComparisons: ComparisonItem[];
      relatedTheory: TheoryQuestion[];
    }>(`/api/topics/${encodeURIComponent(id)}`),

  updateTopicProgress: (
    id: string,
    payload: {
      status?: TopicProgress["status"];
      bookmarked?: boolean;
      needsRevision?: boolean;
      notes?: string;
      addStudySeconds?: number;
    }
  ) =>
    request<{ progress: TopicProgress }>(`/api/topics/${encodeURIComponent(id)}/progress`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  questions: () => request<{ questions: TheoryQuestion[] }>("/api/questions"),

  updateQuestionAttempt: (
    id: string,
    payload: {
      status?: "Untouched" | "Solved" | "Incorrect" | "Skipped";
      bookmarked?: boolean;
      needsRevision?: boolean;
      notes?: string;
      advanceRevision?: boolean;
    }
  ) =>
    request(`/api/questions/${encodeURIComponent(id)}/attempt`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  codingList: () =>
    request<{ problems: CodingProblem[]; compilerAvailable: boolean; compilerName: string }>(
      "/api/coding"
    ),

  codingDetail: (id: string) =>
    request<{
      problem: CodingProblem;
      status: CodingStatus;
      submissions: CodingSubmission[];
      compilerAvailable: boolean;
      compilerName: string;
    }>(`/api/coding/${encodeURIComponent(id)}`),

  runCode: (id: string, code: string, stdin = "") =>
    request<{ result: SandboxExecutionResult; expectedOutput: string }>(
      `/api/code/${encodeURIComponent(id)}/run`,
      {
        method: "POST",
        body: JSON.stringify({ code, stdin }),
      }
    ),

  submitCode: (id: string, code: string) =>
    request<{
      result: SandboxExecutionResult;
      expectedOutput: string;
      submission: CodingSubmission;
      status: CodingStatus;
    }>(`/api/code/${encodeURIComponent(id)}/submit`, {
      method: "POST",
      body: JSON.stringify({ code }),
    }),

  updateCodingMeta: (
    id: string,
    payload: {
      savedCode?: string;
      bookmarked?: boolean;
      needsRevision?: boolean;
      notes?: string;
      solved?: boolean;
    }
  ) =>
    request<{ status: CodingStatus }>(`/api/code/${encodeURIComponent(id)}/meta`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  outputs: () => request<{ puzzles: OutputPuzzle[] }>("/api/outputs"),

  submitOutput: (
    id: string,
    prediction: string,
    claimType: "output" | "ub" | "compile_error" = "output"
  ) =>
    request<{ attempt: OutputAttempt; isCorrect: boolean }>(
      `/api/outputs/${encodeURIComponent(id)}/submit`,
      {
        method: "POST",
        body: JSON.stringify({ prediction, claimType }),
      }
    ),

  updateOutputMeta: (
    id: string,
    payload: { bookmarked?: boolean; needsRevision?: boolean; notes?: string }
  ) =>
    request<{ attempt: OutputAttempt }>(`/api/outputs/${encodeURIComponent(id)}/meta`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  comparisons: () => request<{ comparisons: ComparisonItem[] }>("/api/comparisons"),

  updateComparisonProgress: (
    id: string,
    payload: { bookmarked?: boolean; revised?: boolean; notes?: string }
  ) =>
    request(`/api/comparisons/${encodeURIComponent(id)}/progress`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  designs: () => request<{ designs: DesignProblem[] }>("/api/designs"),

  updateDesignProgress: (
    id: string,
    payload: {
      completed?: boolean;
      bookmarked?: boolean;
      checklistJson?: string;
      notes?: string;
    }
  ) =>
    request(`/api/designs/${encodeURIComponent(id)}/progress`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  solidModern: () =>
    request<{
      content: SolidAndModernContent;
      progressMap: Record<string, SolidModuleProgress>;
    }>("/api/solid-modern"),

  updateSolidModern: (
    id: string,
    payload: { completed?: boolean; solvedPracticeJson?: string; notes?: string }
  ) =>
    request(`/api/solid-modern/${encodeURIComponent(id)}/progress`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  mocks: () => request<{ rounds: MockRoundSummary[] }>("/api/mocks"),

  mockDetail: (id: string) =>
    request<{ round: MockRoundDetail; attempts: MockAttempt[] }>(
      `/api/mocks/${encodeURIComponent(id)}`
    ),

  submitMock: (
    id: string,
    payload: {
      durationSeconds: number;
      answers: {
        number: number;
        response: string;
        markedForReview?: boolean;
        selfScore?: number;
      }[];
    }
  ) =>
    request<{
      attempt: MockAttempt;
      gradedQuestions: GradedMockQuestion[];
      topicBreakdown: Record<string, { earned: number; max: number }>;
    }>(`/api/mocks/${encodeURIComponent(id)}/submit`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateMockScores: (attemptId: number, scores: Record<string, number>) =>
    request<{
      attempt: MockAttempt;
      gradedQuestions: GradedMockQuestion[];
      topicBreakdown: Record<string, { earned: number; max: number }>;
    }>(`/api/mocks/attempts/${attemptId}`, {
      method: "PATCH",
      body: JSON.stringify({ scores }),
    }),

  studyPlan: () => request<{ days: StudyDay[] }>("/api/study-plan"),

  updateStudyDay: (
    day: number,
    payload: { completed?: boolean; completedTasksJson?: string; notes?: string }
  ) =>
    request(`/api/study-plan/${day}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  revisions: () =>
    request<{
      topics: Array<{ topicId: string; status: string; bookmarked: boolean; needsRevision: boolean; notes: string; meta?: TopicItem }>;
      questions: Array<{ questionId: string; status: string; bookmarked: boolean; needsRevision: boolean; notes: string; revisionStage: number; nextRevisionAt: string | null; meta?: TheoryQuestion }>;
      outputs: Array<{ puzzleId: string; isCorrect: boolean; bookmarked: boolean; needsRevision: boolean; notes: string; revisionStage: number; nextRevisionAt: string | null; meta?: OutputPuzzle }>;
      coding: Array<{ problemId: string; solved: boolean; bookmarked: boolean; needsRevision: boolean; notes: string; meta?: CodingProblem }>;
    }>("/api/revisions"),

  completeRevision: (kind: "topic" | "question" | "output" | "coding", id: string) =>
    request<{ ok: boolean }>("/api/revisions/complete", {
      method: "POST",
      body: JSON.stringify({ kind, id }),
    }),

  settings: () => request<{ profile: UserProfile }>("/api/settings"),

  updateSettings: (payload: {
    displayName?: string;
    theme?: "dark" | "light";
    dailyTargetMinutes?: number;
  }) =>
    request<{ profile: UserProfile }>("/api/settings", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  exportProgress: () => request<Record<string, unknown>>("/api/export"),

  importProgress: (payload: { data: unknown }) =>
    request<{ ok: boolean }>("/api/import", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
