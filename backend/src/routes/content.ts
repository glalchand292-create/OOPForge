import { Router } from "express";
import { contentStore } from "../lib/contentLoader.js";
import { prisma } from "../lib/prisma.js";
import { detectCppCompiler, isLocalSandboxEnabled } from "../sandbox/cppRunner.js";

export const contentRouter = Router();

contentRouter.get("/health", async (_req, res) => {
  const sandboxEnabled = isLocalSandboxEnabled();
  const compiler = sandboxEnabled ? await detectCppCompiler() : null;
  res.json({
    ok: true,
    sandboxEnabled,
    compilerAvailable: Boolean(compiler),
    compilerName: compiler || "none",
  });
});

contentRouter.get("/search", (req, res) => {
  const q = String(req.query.q || "").trim().toLowerCase();
  if (!q) {
    res.json({ results: [] });
    return;
  }

  const results: Array<{
    type: string;
    id: string;
    title: string;
    subtitle: string;
    route: string;
  }> = [];

  for (const t of contentStore.topics) {
    if (
      t.title.toLowerCase().includes(q) ||
      t.simpleExplanation.toLowerCase().includes(q)
    ) {
      results.push({
        type: "Topic",
        id: t.id,
        title: `${t.number}. ${t.title}`,
        subtitle: `${t.chapterTitle} • ${t.difficulty}`,
        route: `/topics/${t.id}`,
      });
    }
  }

  for (const th of contentStore.theoryQuestions) {
    if (
      th.question.toLowerCase().includes(q) ||
      th.category.toLowerCase().includes(q)
    ) {
      results.push({
        type: "Question",
        id: th.id,
        title: th.question,
        subtitle: `${th.source} • ${th.difficulty}`,
        route: `/theory?topic=${th.topicId}&q=${th.id}`,
      });
    }
  }

  for (const c of contentStore.codingProblems) {
    if (
      c.title.toLowerCase().includes(q) ||
      c.problemStatement.toLowerCase().includes(q) ||
      c.concepts.some((tag) => tag.toLowerCase().includes(q))
    ) {
      results.push({
        type: "Coding",
        id: c.id,
        title: `#${c.number} ${c.title}`,
        subtitle: `${c.difficulty} • ${c.concepts.slice(0, 3).join(", ")}`,
        route: `/coding?id=${c.id}`,
      });
    }
  }

  for (const o of contentStore.outputPuzzles) {
    if (
      o.title.toLowerCase().includes(q) ||
      o.concepts.toLowerCase().includes(q) ||
      o.category.toLowerCase().includes(q)
    ) {
      results.push({
        type: "Output",
        id: o.id,
        title: `Puzzle #${o.number}: ${o.title}`,
        subtitle: `${o.category}${o.isUndefinedBehavior ? " • UB" : ""}`,
        route: `/outputs?id=${o.id}`,
      });
    }
  }

  for (const cp of contentStore.comparisons) {
    if (cp.title.toLowerCase().includes(q)) {
      results.push({
        type: "Comparison",
        id: cp.id,
        title: cp.title,
        subtitle: "Side-by-side comparison",
        route: `/comparisons?id=${cp.id}`,
      });
    }
  }

  for (const d of contentStore.designs) {
    if (
      d.title.toLowerCase().includes(q) ||
      d.requirements.toLowerCase().includes(q)
    ) {
      results.push({
        type: "Design",
        id: d.id,
        title: d.title,
        subtitle: `${d.difficulty} • Real-World LLD`,
        route: `/designs?id=${d.id}`,
      });
    }
  }

  res.json({ results: results.slice(0, 30) });
});

contentRouter.get("/topics", async (_req, res) => {
  const rows = await prisma.topicProgress.findMany();
  const map = new Map(rows.map((r) => [r.topicId, r]));
  const items = contentStore.topics.map((t) => ({
    ...t,
    progress: map.get(t.id) ?? {
      topicId: t.id,
      status: "Not Started",
      bookmarked: false,
      needsRevision: false,
      notes: "",
      studySeconds: 0,
      lastStudiedAt: null,
    },
  }));
  res.json({ topics: items });
});

contentRouter.get("/topics/:id", async (req, res) => {
  const topic = contentStore.topics.find((t) => t.id === req.params.id);
  if (!topic) {
    res.status(404).json({ error: "Topic not found" });
    return;
  }
  const progress = await prisma.topicProgress.findUnique({ where: { topicId: topic.id } });
  const relatedCoding = contentStore.codingProblems.filter((c) => topic.relatedCodingIds.includes(c.id));
  const relatedOutputs = contentStore.outputPuzzles.filter((o) => topic.relatedOutputIds.includes(o.id));
  const relatedComparisons = contentStore.comparisons.filter((cp) => topic.relatedComparisonIds.includes(cp.id));
  const relatedTheory = contentStore.theoryQuestions.filter((q) => topic.relatedTheoryIds.includes(q.id));

  res.json({
    topic,
    progress: progress ?? {
      topicId: topic.id,
      status: "Not Started",
      bookmarked: false,
      needsRevision: false,
      notes: "",
      studySeconds: 0,
      lastStudiedAt: null,
    },
    relatedCoding,
    relatedOutputs,
    relatedComparisons,
    relatedTheory,
  });
});

contentRouter.get("/questions", async (_req, res) => {
  const attempts = await prisma.questionAttempt.findMany();
  const map = new Map(attempts.map((a) => [a.questionId, a]));
  const items = contentStore.theoryQuestions.map((q) => ({
    ...q,
    attempt: map.get(q.id) ?? {
      questionId: q.id,
      topicId: q.topicId,
      status: "Untouched",
      bookmarked: false,
      needsRevision: false,
      notes: "",
      revisionStage: 0,
      nextRevisionAt: null,
      lastAttemptedAt: null,
    },
  }));
  res.json({ questions: items });
});

contentRouter.get("/coding", async (_req, res) => {
  const statuses = await prisma.codingStatus.findMany();
  const map = new Map(statuses.map((s) => [s.problemId, s]));
  const compiler = await detectCppCompiler();
  const items = contentStore.codingProblems.map((p) => {
    const st = map.get(p.id);
    return {
      ...p,
      status: st ?? {
        problemId: p.id,
        solved: false,
        bookmarked: false,
        needsRevision: false,
        savedCode: "",
        notes: "",
        lastSubmittedAt: null,
      },
    };
  });
  res.json({
    problems: items,
    compilerAvailable: Boolean(compiler),
    compilerName: compiler || "none",
  });
});

contentRouter.get("/coding/:id", async (req, res) => {
  const problem = contentStore.codingProblems.find((p) => p.id === req.params.id);
  if (!problem) {
    res.status(404).json({ error: "Coding problem not found" });
    return;
  }
  const status = await prisma.codingStatus.findUnique({ where: { problemId: problem.id } });
  const submissions = await prisma.codingSubmission.findMany({
    where: { problemId: problem.id },
    orderBy: { createdAt: "desc" },
    take: 15,
  });
  const compiler = await detectCppCompiler();
  res.json({
    problem,
    status: status ?? {
      problemId: problem.id,
      solved: false,
      bookmarked: false,
      needsRevision: false,
      savedCode: "",
      notes: "",
      lastSubmittedAt: null,
    },
    submissions,
    compilerAvailable: Boolean(compiler),
    compilerName: compiler || "none",
  });
});

contentRouter.get("/outputs", async (_req, res) => {
  const attempts = await prisma.outputAttempt.findMany();
  const map = new Map(attempts.map((a) => [a.puzzleId, a]));
  const items = contentStore.outputPuzzles.map((p) => ({
    ...p,
    attempt: map.get(p.id) ?? {
      puzzleId: p.id,
      category: p.category,
      userPrediction: "",
      attempted: false,
      isCorrect: false,
      bookmarked: false,
      needsRevision: false,
      notes: "",
      revisionStage: 0,
      nextRevisionAt: null,
      attemptedAt: null,
    },
  }));
  res.json({ puzzles: items });
});

contentRouter.get("/comparisons", async (_req, res) => {
  const rows = await prisma.comparisonProgress.findMany();
  const map = new Map(rows.map((r) => [r.comparisonId, r]));
  const items = contentStore.comparisons.map((c) => ({
    ...c,
    progress: map.get(c.id) ?? {
      comparisonId: c.id,
      bookmarked: false,
      revised: false,
      notes: "",
    },
  }));
  res.json({ comparisons: items });
});

contentRouter.get("/designs", async (_req, res) => {
  const rows = await prisma.designProgress.findMany();
  const map = new Map(rows.map((r) => [r.designId, r]));
  const items = contentStore.designs.map((d) => ({
    ...d,
    progress: map.get(d.id) ?? {
      designId: d.id,
      completed: false,
      bookmarked: false,
      checklistJson: "{}",
      notes: "",
    },
  }));
  res.json({ designs: items });
});

contentRouter.get("/solid-modern", async (_req, res) => {
  const rows = await prisma.solidModuleProgress.findMany();
  const map = new Map(rows.map((r) => [r.moduleId, r]));
  res.json({
    content: contentStore.solidAndModern,
    progressMap: Object.fromEntries(map),
  });
});

contentRouter.get("/mocks", async (_req, res) => {
  const attempts = await prisma.mockAttempt.findMany({
    orderBy: { submittedAt: "desc" },
  });
  const rounds = contentStore.mockInterviews.map((r) => ({
    id: r.id,
    roundNumber: r.roundNumber,
    title: r.title,
    difficulty: r.difficulty,
    durationMinutes: r.durationMinutes,
    questionCount: r.questions.length,
    attempts: attempts.filter((a) => a.roundId === r.id),
  }));
  res.json({ rounds });
});

// NEVER expose answerKey before submission!
contentRouter.get("/mocks/:id", async (req, res) => {
  const round = contentStore.mockInterviews.find((r) => r.id === req.params.id);
  if (!round) {
    res.status(404).json({ error: "Mock round not found" });
    return;
  }
  const attempts = await prisma.mockAttempt.findMany({
    where: { roundId: round.id },
    orderBy: { submittedAt: "desc" },
  });
  res.json({
    round: {
      id: round.id,
      roundNumber: round.roundNumber,
      title: round.title,
      difficulty: round.difficulty,
      durationMinutes: round.durationMinutes,
      questions: round.questions.map((q) => ({
        number: q.number,
        type: q.type,
        prompt: q.prompt,
        code: q.code,
      })),
    },
    attempts,
  });
});

contentRouter.get("/study-plan", async (_req, res) => {
  const rows = await prisma.studyPlanDay.findMany();
  const map = new Map(rows.map((r) => [r.day, r]));
  const days = contentStore.studyPlan.map((d) => ({
    ...d,
    progress: map.get(d.day) ?? {
      day: d.day,
      completed: false,
      completedTasksJson: "{}",
      notes: "",
      completedAt: null,
    },
  }));
  res.json({ days });
});
