import { Router, type Request } from "express";
import { z } from "zod";
import { contentStore } from "../lib/contentLoader.js";
import { ensureUserProfile, prisma, recordStudyActivity, todayDateKey } from "../lib/prisma.js";
import { isLocalSandboxEnabled, normalizeOutput, runCpp17InSandbox } from "../sandbox/cppRunner.js";

export const progressRouter = Router();

const executionHits = new Map<string, { count: number; resetAt: number }>();

function checkExecutionRateLimit(req: Request): boolean {
  const key = req.ip || "local";
  const now = Date.now();
  const entry = executionHits.get(key);
  if (!entry || now > entry.resetAt) {
    executionHits.set(key, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 20) return false;
  entry.count += 1;
  return true;
}

const REVISION_INTERVAL_DAYS = [0, 1, 3, 7, 14];

function computeNextRevision(stage: number): Date {
  const days = REVISION_INTERVAL_DAYS[Math.min(stage, REVISION_INTERVAL_DAYS.length - 1)] || 1;
  return new Date(Date.now() + days * 86400000);
}

progressRouter.get("/dashboard", async (_req, res) => {
  const profile = await ensureUserProfile();
  const [
    topicRows,
    questionRows,
    codingRows,
    outputRows,
    designRows,
    planRows,
    mockRows,
    sessionLogs,
  ] = await Promise.all([
    prisma.topicProgress.findMany({ orderBy: { lastStudiedAt: "desc" } }),
    prisma.questionAttempt.findMany(),
    prisma.codingStatus.findMany(),
    prisma.outputAttempt.findMany(),
    prisma.designProgress.findMany(),
    prisma.studyPlanDay.findMany(),
    prisma.mockAttempt.findMany({ orderBy: { submittedAt: "desc" }, take: 10 }),
    prisma.studySessionLog.findMany({ orderBy: { createdAt: "desc" }, take: 60 }),
  ]);

  const totalTopics = contentStore.topics.length;
  const topicsCompleted = topicRows.filter((t) => t.status === "Completed").length;
  const topicsInProgress = topicRows.filter((t) => t.status === "In Progress").length;

  const totalQuestions = contentStore.theoryQuestions.length;
  const questionsSolved = questionRows.filter((q) => q.status === "Solved").length;

  const totalCoding = contentStore.codingProblems.length;
  const codingSolved = codingRows.filter((c) => c.solved).length;

  const totalOutputs = contentStore.outputPuzzles.length;
  const outputsAttempted = outputRows.filter((o) => o.attempted).length;
  const outputsCorrect = outputRows.filter((o) => o.isCorrect).length;

  const designsCompleted = designRows.filter((d) => d.completed).length;
  const planDaysCompleted = planRows.filter((p) => p.completed).length;

  const totalUnits = totalTopics + totalQuestions + totalCoding + totalOutputs;
  const doneUnits = topicsCompleted + questionsSolved + codingSolved + outputsCorrect;
  const overallCompletionPct = totalUnits > 0 ? Math.round((doneUnits / totalUnits) * 100) : 0;

  const topicMap = new Map(contentStore.topics.map((t) => [t.id, t]));
  const recentlyStudiedTopics = topicRows
    .filter((r) => r.lastStudiedAt)
    .slice(0, 5)
    .map((r) => ({
      topicId: r.topicId,
      title: topicMap.get(r.topicId)?.title || r.topicId,
      status: r.status,
      lastStudiedAt: r.lastStudiedAt,
    }));

  // Compute weakest topics from incorrect questions + topics marked Needs Revision
  const topicWeakScore = new Map<string, { incorrect: number; needsRev: boolean }>();
  for (const q of questionRows) {
    if (q.status === "Incorrect" || q.needsRevision) {
      const cur = topicWeakScore.get(q.topicId) ?? { incorrect: 0, needsRev: false };
      if (q.status === "Incorrect") cur.incorrect += 1;
      if (q.needsRevision) cur.needsRev = true;
      topicWeakScore.set(q.topicId, cur);
    }
  }
  for (const t of topicRows) {
    if (t.status === "Needs Revision" || t.needsRevision) {
      const cur = topicWeakScore.get(t.topicId) ?? { incorrect: 0, needsRev: false };
      cur.needsRev = true;
      topicWeakScore.set(t.topicId, cur);
    }
  }

  const weakestTopics = Array.from(topicWeakScore.entries())
    .sort((a, b) => b[1].incorrect - a[1].incorrect)
    .slice(0, 5)
    .map(([topicId, info]) => ({
      topicId,
      title: topicMap.get(topicId)?.title || topicId,
      incorrectCount: info.incorrect,
      needsRevision: info.needsRev,
    }));

  const now = new Date();
  const pendingRevisionsCount =
    topicRows.filter((t) => t.needsRevision || t.status === "Needs Revision").length +
    questionRows.filter((q) => q.needsRevision || (q.nextRevisionAt && q.nextRevisionAt <= now)).length +
    outputRows.filter((o) => o.needsRevision || (o.nextRevisionAt && o.nextRevisionAt <= now)).length +
    codingRows.filter((c) => c.needsRevision).length;

  // Build last 7 days study time chart
  const dayMinutes = new Map<string, number>();
  for (let i = 6; i >= 0; i--) {
    const d = todayDateKey(new Date(Date.now() - i * 86400000));
    dayMinutes.set(d, 0);
  }
  for (const log of sessionLogs) {
    if (dayMinutes.has(log.dateKey)) {
      dayMinutes.set(log.dateKey, (dayMinutes.get(log.dateKey) || 0) + log.minutes);
    }
  }
  const studyActivity = Array.from(dayMinutes.entries()).map(([date, minutes]) => ({
    date: date.slice(5),
    minutes,
  }));

  const today = todayDateKey();
  const todayMinutes = sessionLogs
    .filter((l) => l.dateKey === today)
    .reduce((acc, l) => acc + l.minutes, 0);

  // Chapter completion breakdown for roadmap/chart
  const topicRowMap = new Map(topicRows.map((r) => [r.topicId, r]));
  const chapters = [1, 2, 3].map((cid) => {
    const chTopics = contentStore.topics.filter((t) => t.chapterId === cid);
    const completed = chTopics.filter((t) => topicRowMap.get(t.id)?.status === "Completed").length;
    return {
      chapterId: cid,
      title: chTopics[0]?.chapterTitle || `Chapter ${cid}`,
      total: chTopics.length,
      completed,
    };
  });

  res.json({
    profile,
    stats: {
      overallCompletionPct,
      topicsCompleted,
      topicsInProgress,
      totalTopics,
      questionsSolved,
      totalQuestions,
      codingSolved,
      totalCoding,
      outputsAttempted,
      outputsCorrect,
      totalOutputs,
      designsCompleted,
      totalDesigns: contentStore.designs.length,
      planDaysCompleted,
      totalPlanDays: contentStore.studyPlan.length,
      streakCount: profile.streakCount,
      totalStudySeconds: profile.totalStudySeconds,
      dailyTargetMinutes: profile.dailyTargetMinutes,
      todayMinutes,
      pendingRevisionsCount,
    },
    recentlyStudiedTopics,
    weakestTopics,
    studyActivity,
    chapters,
    recentMocks: mockRows,
  });
});

progressRouter.post("/study-time", async (req, res) => {
  const schema = z.object({
    seconds: z.number().int().min(1).max(3600),
    module: z.string().min(1).max(60),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  await recordStudyActivity(parsed.data.seconds, parsed.data.module);
  res.json({ ok: true });
});

progressRouter.put("/topics/:id/progress", async (req, res) => {
  const schema = z.object({
    status: z.enum(["Not Started", "In Progress", "Completed", "Needs Revision"]).optional(),
    bookmarked: z.boolean().optional(),
    needsRevision: z.boolean().optional(),
    notes: z.string().optional(),
    addStudySeconds: z.number().int().min(0).max(7200).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const topicId = req.params.id;
  if (!contentStore.topics.some((t) => t.id === topicId)) {
    res.status(404).json({ error: "Topic not found" });
    return;
  }
  const existing = await prisma.topicProgress.findUnique({ where: { topicId } });
  const nextStatus = parsed.data.status ?? existing?.status ?? "Not Started";
  const nextNeedsRev =
    parsed.data.needsRevision ??
    (nextStatus === "Needs Revision" ? true : existing?.needsRevision ?? false);

  const updated = await prisma.topicProgress.upsert({
    where: { topicId },
    create: {
      topicId,
      status: nextStatus,
      bookmarked: parsed.data.bookmarked ?? false,
      needsRevision: nextNeedsRev,
      notes: parsed.data.notes ?? "",
      studySeconds: parsed.data.addStudySeconds ?? 0,
      lastStudiedAt: new Date(),
    },
    update: {
      ...(parsed.data.status !== undefined ? { status: nextStatus } : {}),
      ...(parsed.data.bookmarked !== undefined ? { bookmarked: parsed.data.bookmarked } : {}),
      ...(parsed.data.needsRevision !== undefined || parsed.data.status !== undefined
        ? { needsRevision: nextNeedsRev }
        : {}),
      ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes } : {}),
      ...(parsed.data.addStudySeconds
        ? { studySeconds: { increment: parsed.data.addStudySeconds } }
        : {}),
      lastStudiedAt: new Date(),
    },
  });

  await recordStudyActivity(parsed.data.addStudySeconds ?? 60, `Topic:${topicId}`);
  res.json({ progress: updated });
});

progressRouter.put("/questions/:id/attempt", async (req, res) => {
  const schema = z.object({
    status: z.enum(["Untouched", "Solved", "Incorrect", "Skipped"]).optional(),
    bookmarked: z.boolean().optional(),
    needsRevision: z.boolean().optional(),
    notes: z.string().optional(),
    advanceRevision: z.boolean().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const q = contentStore.theoryQuestions.find((item) => item.id === req.params.id);
  if (!q) {
    res.status(404).json({ error: "Question not found" });
    return;
  }

  const existing = await prisma.questionAttempt.findUnique({ where: { questionId: q.id } });
  let stage = existing?.revisionStage ?? 0;
  let nextRevAt = existing?.nextRevisionAt ?? null;
  let needsRev = parsed.data.needsRevision ?? existing?.needsRevision ?? false;

  if (parsed.data.status === "Incorrect" || parsed.data.needsRevision === true) {
    stage = 1;
    nextRevAt = computeNextRevision(1);
    needsRev = true;
  } else if (parsed.data.advanceRevision) {
    stage = Math.min(4, stage + 1);
    if (stage >= 4) {
      needsRev = false;
      nextRevAt = null;
    } else {
      nextRevAt = computeNextRevision(stage);
      needsRev = true;
    }
  } else if (parsed.data.status === "Solved" && !parsed.data.needsRevision) {
    needsRev = false;
    nextRevAt = null;
  }

  const updated = await prisma.questionAttempt.upsert({
    where: { questionId: q.id },
    create: {
      questionId: q.id,
      topicId: q.topicId,
      status: parsed.data.status ?? "Untouched",
      bookmarked: parsed.data.bookmarked ?? false,
      needsRevision: needsRev,
      notes: parsed.data.notes ?? "",
      revisionStage: stage,
      nextRevisionAt: nextRevAt,
      lastAttemptedAt: new Date(),
    },
    update: {
      ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
      ...(parsed.data.bookmarked !== undefined ? { bookmarked: parsed.data.bookmarked } : {}),
      needsRevision: needsRev,
      ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes } : {}),
      revisionStage: stage,
      nextRevisionAt: nextRevAt,
      lastAttemptedAt: new Date(),
    },
  });

  if (parsed.data.status && parsed.data.status !== "Untouched") {
    await recordStudyActivity(60, `Theory:${q.topicId}`);
  }
  res.json({ attempt: updated });
});

progressRouter.post("/code/:id/run", async (req, res) => {
  if (!isLocalSandboxEnabled()) {
    res.status(403).json({
      error: "Code execution endpoint is disabled in this environment.",
    });
    return;
  }
  if (!checkExecutionRateLimit(req)) {
    res.status(429).json({
      error: "Rate limit exceeded (max 20 C++ runs per minute).",
    });
    return;
  }
  const schema = z.object({
    code: z.string().min(1).max(64 * 1024),
    stdin: z.string().max(16 * 1024).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const problem = contentStore.codingProblems.find((p) => p.id === req.params.id);
  if (!problem) {
    res.status(404).json({ error: "Coding problem not found" });
    return;
  }

  // Save draft code automatically
  await prisma.codingStatus.upsert({
    where: { problemId: problem.id },
    create: { problemId: problem.id, savedCode: parsed.data.code },
    update: { savedCode: parsed.data.code },
  });

  const result = await runCpp17InSandbox(
    parsed.data.code,
    problem.expectedStdout,
    parsed.data.stdin ?? ""
  );

  res.json({
    result,
    expectedOutput: problem.expectedStdout,
  });
});

progressRouter.post("/code/:id/submit", async (req, res) => {
  if (!isLocalSandboxEnabled()) {
    res.status(403).json({
      error: "Code execution endpoint is disabled in this environment.",
    });
    return;
  }
  if (!checkExecutionRateLimit(req)) {
    res.status(429).json({
      error: "Rate limit exceeded (max 20 C++ submissions per minute).",
    });
    return;
  }
  const schema = z.object({
    code: z.string().min(1).max(64 * 1024),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const problem = contentStore.codingProblems.find((p) => p.id === req.params.id);
  if (!problem) {
    res.status(404).json({ error: "Coding problem not found" });
    return;
  }

  const result = await runCpp17InSandbox(parsed.data.code, problem.expectedStdout);

  const submission = await prisma.codingSubmission.create({
    data: {
      problemId: problem.id,
      code: parsed.data.code,
      status: result.status,
      stdout: result.stdout,
      stderr: result.stderr || result.compileOutput,
      runtimeMs: result.runtimeMs,
      passed: result.passed,
    },
  });

  const existing = await prisma.codingStatus.findUnique({ where: { problemId: problem.id } });
  const status = await prisma.codingStatus.upsert({
    where: { problemId: problem.id },
    create: {
      problemId: problem.id,
      solved: result.passed,
      savedCode: parsed.data.code,
      lastSubmittedAt: new Date(),
    },
    update: {
      solved: Boolean(existing?.solved || result.passed),
      savedCode: parsed.data.code,
      lastSubmittedAt: new Date(),
    },
  });

  await recordStudyActivity(120, `Coding:${problem.id}`);
  res.json({
    result,
    expectedOutput: problem.expectedStdout,
    submission,
    status,
  });
});

progressRouter.put("/code/:id/meta", async (req, res) => {
  const schema = z.object({
    savedCode: z.string().optional(),
    bookmarked: z.boolean().optional(),
    needsRevision: z.boolean().optional(),
    notes: z.string().optional(),
    solved: z.boolean().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const problem = contentStore.codingProblems.find((p) => p.id === req.params.id);
  if (!problem) {
    res.status(404).json({ error: "Coding problem not found" });
    return;
  }
  const updated = await prisma.codingStatus.upsert({
    where: { problemId: problem.id },
    create: {
      problemId: problem.id,
      savedCode: parsed.data.savedCode ?? "",
      bookmarked: parsed.data.bookmarked ?? false,
      needsRevision: parsed.data.needsRevision ?? false,
      notes: parsed.data.notes ?? "",
      solved: parsed.data.solved ?? false,
    },
    update: parsed.data,
  });
  res.json({ status: updated });
});

progressRouter.post("/outputs/:id/submit", async (req, res) => {
  const schema = z.object({
    prediction: z.string(),
    claimType: z.enum(["output", "ub", "compile_error"]).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const puzzle = contentStore.outputPuzzles.find((p) => p.id === req.params.id);
  if (!puzzle) {
    res.status(404).json({ error: "Output puzzle not found" });
    return;
  }

  const predNorm = normalizeOutput(parsed.data.prediction).replace(/\s+/g, " ");
  const expNorm = normalizeOutput(puzzle.expectedOutput).replace(/\s+/g, " ");
  const claim = parsed.data.claimType ?? "output";

  let isCorrect = false;
  if (puzzle.isUndefinedBehavior) {
    isCorrect =
      claim === "ub" ||
      /undefined\s*behavior|\bub\b/i.test(parsed.data.prediction);
  } else if (puzzle.isCompileError) {
    isCorrect =
      claim === "compile_error" ||
      /compile\s*error|ambiguous|deleted|inaccessible/i.test(parsed.data.prediction) ||
      (predNorm.length > 0 && expNorm.toLowerCase().includes(predNorm.toLowerCase()));
  } else {
    isCorrect = predNorm === expNorm;
  }

  const existing = await prisma.outputAttempt.findUnique({ where: { puzzleId: puzzle.id } });
  const stage = isCorrect ? Math.min(4, (existing?.revisionStage ?? 0) + 1) : 1;
  const needsRev = !isCorrect;

  const attempt = await prisma.outputAttempt.upsert({
    where: { puzzleId: puzzle.id },
    create: {
      puzzleId: puzzle.id,
      category: puzzle.category,
      userPrediction: parsed.data.prediction,
      attempted: true,
      isCorrect,
      needsRevision: needsRev,
      revisionStage: stage,
      nextRevisionAt: needsRev ? computeNextRevision(1) : null,
      attemptedAt: new Date(),
    },
    update: {
      userPrediction: parsed.data.prediction,
      attempted: true,
      isCorrect,
      needsRevision: needsRev,
      revisionStage: stage,
      nextRevisionAt: needsRev ? computeNextRevision(1) : null,
      attemptedAt: new Date(),
    },
  });

  await recordStudyActivity(60, `Output:${puzzle.id}`);
  res.json({ attempt, isCorrect });
});

progressRouter.put("/outputs/:id/meta", async (req, res) => {
  const schema = z.object({
    bookmarked: z.boolean().optional(),
    needsRevision: z.boolean().optional(),
    notes: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const puzzle = contentStore.outputPuzzles.find((p) => p.id === req.params.id);
  if (!puzzle) {
    res.status(404).json({ error: "Output puzzle not found" });
    return;
  }
  const attempt = await prisma.outputAttempt.upsert({
    where: { puzzleId: puzzle.id },
    create: {
      puzzleId: puzzle.id,
      category: puzzle.category,
      bookmarked: parsed.data.bookmarked ?? false,
      needsRevision: parsed.data.needsRevision ?? false,
      notes: parsed.data.notes ?? "",
      nextRevisionAt: parsed.data.needsRevision ? computeNextRevision(1) : null,
      revisionStage: parsed.data.needsRevision ? 1 : 0,
    },
    update: {
      ...parsed.data,
      ...(parsed.data.needsRevision === true
        ? { nextRevisionAt: computeNextRevision(1), revisionStage: 1 }
        : {}),
    },
  });
  res.json({ attempt });
});

progressRouter.put("/comparisons/:id/progress", async (req, res) => {
  const schema = z.object({
    bookmarked: z.boolean().optional(),
    revised: z.boolean().optional(),
    notes: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const progress = await prisma.comparisonProgress.upsert({
    where: { comparisonId: req.params.id },
    create: {
      comparisonId: req.params.id,
      bookmarked: parsed.data.bookmarked ?? false,
      revised: parsed.data.revised ?? false,
      notes: parsed.data.notes ?? "",
    },
    update: parsed.data,
  });
  res.json({ progress });
});

progressRouter.put("/designs/:id/progress", async (req, res) => {
  const schema = z.object({
    completed: z.boolean().optional(),
    bookmarked: z.boolean().optional(),
    checklistJson: z.string().optional(),
    notes: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const progress = await prisma.designProgress.upsert({
    where: { designId: req.params.id },
    create: {
      designId: req.params.id,
      completed: parsed.data.completed ?? false,
      bookmarked: parsed.data.bookmarked ?? false,
      checklistJson: parsed.data.checklistJson ?? "{}",
      notes: parsed.data.notes ?? "",
    },
    update: parsed.data,
  });
  await recordStudyActivity(60, `Design:${req.params.id}`);
  res.json({ progress });
});

progressRouter.put("/solid-modern/:id/progress", async (req, res) => {
  const schema = z.object({
    completed: z.boolean().optional(),
    solvedPracticeJson: z.string().optional(),
    notes: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const progress = await prisma.solidModuleProgress.upsert({
    where: { moduleId: req.params.id },
    create: {
      moduleId: req.params.id,
      completed: parsed.data.completed ?? false,
      solvedPracticeJson: parsed.data.solvedPracticeJson ?? "{}",
      notes: parsed.data.notes ?? "",
    },
    update: parsed.data,
  });
  await recordStudyActivity(60, `SolidModern:${req.params.id}`);
  res.json({ progress });
});

progressRouter.post("/mocks/:id/submit", async (req, res) => {
  const schema = z.object({
    durationSeconds: z.number().int().min(0).max(7200),
    answers: z.array(
      z.object({
        number: z.number().int(),
        response: z.string(),
        markedForReview: z.boolean().optional(),
        selfScore: z.number().int().min(0).max(10).optional(),
      })
    ),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const round = contentStore.mockInterviews.find((r) => r.id === req.params.id);
  if (!round) {
    res.status(404).json({ error: "Mock round not found" });
    return;
  }

  const answerByNum = new Map(parsed.data.answers.map((a) => [a.number, a]));
  const typeTotals: Record<string, { earned: number; max: number }> = {};

  let totalScore = 0;
  const gradedQuestions = round.questions.map((q) => {
    const userAns = answerByNum.get(q.number);
    const resp = (userAns?.response || "").trim();
    let earned = 0;

    if (userAns?.selfScore !== undefined) {
      earned = userAns.selfScore;
    } else if (q.type === "Output") {
      // Auto-extract expected output token from answerKey
      const key = q.answerKey;
      const m = key.match(/\*\*Output:\*\*\s*`([^`]+)`/i);
      const isUb = /\[UNDEFINED BEHAVIOR\]/i.test(key);
      if (isUb) {
        earned = /undefined\s*behavior|\bub\b/i.test(resp) ? 10 : 0;
      } else if (m) {
        const exp = m[1].replace(/\s+/g, " ").trim();
        const got = resp.replace(/\s+/g, " ").trim();
        earned = exp === got ? 10 : got.length > 0 && exp.includes(got) ? 5 : 0;
      } else {
        earned = resp.length >= 3 ? 6 : 0;
      }
    } else {
      // Heuristic starter score based on answer completeness (user can refine with rubric after reveal!)
      earned = resp.length >= 80 ? 8 : resp.length >= 25 ? 6 : resp.length > 0 ? 4 : 0;
    }

    totalScore += earned;
    typeTotals[q.type] = typeTotals[q.type] ?? { earned: 0, max: 0 };
    typeTotals[q.type].earned += earned;
    typeTotals[q.type].max += 10;

    return {
      number: q.number,
      type: q.type,
      prompt: q.prompt,
      code: q.code,
      userResponse: resp,
      earnedScore: earned,
      answerKey: q.answerKey,
    };
  });

  const attempt = await prisma.mockAttempt.create({
    data: {
      roundId: round.id,
      roundNumber: round.roundNumber,
      score: totalScore,
      maxScore: round.questions.length * 10,
      durationSeconds: parsed.data.durationSeconds,
      answersJson: JSON.stringify(gradedQuestions),
      topicBreakdownJson: JSON.stringify(typeTotals),
    },
  });

  await recordStudyActivity(Math.max(120, parsed.data.durationSeconds), `Mock:${round.id}`);
  res.json({ attempt, gradedQuestions, topicBreakdown: typeTotals });
});

progressRouter.patch("/mocks/attempts/:attemptId", async (req, res) => {
  const schema = z.object({
    scores: z.record(z.string(), z.number().int().min(0).max(10)),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const attemptId = Number(req.params.attemptId);
  const existing = await prisma.mockAttempt.findUnique({ where: { id: attemptId } });
  if (!existing) {
    res.status(404).json({ error: "Attempt not found" });
    return;
  }
  const graded = JSON.parse(existing.answersJson) as Array<{
    number: number;
    type: string;
    earnedScore: number;
  }>;
  let totalScore = 0;
  const typeTotals: Record<string, { earned: number; max: number }> = {};
  for (const item of graded) {
    const updatedScore = parsed.data.scores[String(item.number)] ?? item.earnedScore;
    item.earnedScore = updatedScore;
    totalScore += updatedScore;
    typeTotals[item.type] = typeTotals[item.type] ?? { earned: 0, max: 0 };
    typeTotals[item.type].earned += updatedScore;
    typeTotals[item.type].max += 10;
  }
  const updated = await prisma.mockAttempt.update({
    where: { id: attemptId },
    data: {
      score: totalScore,
      answersJson: JSON.stringify(graded),
      topicBreakdownJson: JSON.stringify(typeTotals),
    },
  });
  res.json({ attempt: updated, gradedQuestions: graded, topicBreakdown: typeTotals });
});

progressRouter.put("/study-plan/:day", async (req, res) => {
  const schema = z.object({
    completed: z.boolean().optional(),
    completedTasksJson: z.string().optional(),
    notes: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const dayNum = Number(req.params.day);
  if (!contentStore.studyPlan.some((d) => d.day === dayNum)) {
    res.status(404).json({ error: "Study plan day not found" });
    return;
  }
  const updated = await prisma.studyPlanDay.upsert({
    where: { day: dayNum },
    create: {
      day: dayNum,
      completed: parsed.data.completed ?? false,
      completedTasksJson: parsed.data.completedTasksJson ?? "{}",
      notes: parsed.data.notes ?? "",
      completedAt: parsed.data.completed ? new Date() : null,
    },
    update: {
      ...parsed.data,
      ...(parsed.data.completed !== undefined
        ? { completedAt: parsed.data.completed ? new Date() : null }
        : {}),
    },
  });
  await recordStudyActivity(60, `StudyPlan:Day${dayNum}`);
  res.json({ progress: updated });
});

progressRouter.get("/revisions", async (_req, res) => {
  const [topics, questions, outputs, coding] = await Promise.all([
    prisma.topicProgress.findMany(),
    prisma.questionAttempt.findMany(),
    prisma.outputAttempt.findMany(),
    prisma.codingStatus.findMany(),
  ]);

  const topicMap = new Map(contentStore.topics.map((t) => [t.id, t]));
  const questionMap = new Map(contentStore.theoryQuestions.map((q) => [q.id, q]));
  const puzzleMap = new Map(contentStore.outputPuzzles.map((p) => [p.id, p]));
  const codingMap = new Map(contentStore.codingProblems.map((c) => [c.id, c]));

  res.json({
    topics: topics
      .filter((t) => t.needsRevision || t.bookmarked || t.status === "Needs Revision" || t.notes)
      .map((t) => ({ ...t, meta: topicMap.get(t.topicId) })),
    questions: questions
      .filter((q) => q.needsRevision || q.bookmarked || q.status === "Incorrect" || q.notes)
      .map((q) => ({ ...q, meta: questionMap.get(q.questionId) })),
    outputs: outputs
      .filter((o) => o.needsRevision || o.bookmarked || (o.attempted && !o.isCorrect) || o.notes)
      .map((o) => ({ ...o, meta: puzzleMap.get(o.puzzleId) })),
    coding: coding
      .filter((c) => c.needsRevision || c.bookmarked || c.notes)
      .map((c) => ({ ...c, meta: codingMap.get(c.problemId) })),
  });
});

progressRouter.post("/revisions/complete", async (req, res) => {
  const schema = z.object({
    kind: z.enum(["topic", "question", "output", "coding"]),
    id: z.string(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { kind, id } = parsed.data;
  if (kind === "topic") {
    await prisma.topicProgress.update({
      where: { topicId: id },
      data: { needsRevision: false, status: "Completed" },
    });
  } else if (kind === "question") {
    const cur = await prisma.questionAttempt.findUnique({ where: { questionId: id } });
    const nextStage = Math.min(4, (cur?.revisionStage ?? 0) + 1);
    await prisma.questionAttempt.update({
      where: { questionId: id },
      data: {
        revisionStage: nextStage,
        needsRevision: nextStage < 4,
        nextRevisionAt: nextStage < 4 ? computeNextRevision(nextStage) : null,
        status: "Solved",
      },
    });
  } else if (kind === "output") {
    const cur = await prisma.outputAttempt.findUnique({ where: { puzzleId: id } });
    const nextStage = Math.min(4, (cur?.revisionStage ?? 0) + 1);
    await prisma.outputAttempt.update({
      where: { puzzleId: id },
      data: {
        revisionStage: nextStage,
        needsRevision: nextStage < 4,
        nextRevisionAt: nextStage < 4 ? computeNextRevision(nextStage) : null,
        isCorrect: true,
      },
    });
  } else if (kind === "coding") {
    await prisma.codingStatus.update({
      where: { problemId: id },
      data: { needsRevision: false },
    });
  }
  await recordStudyActivity(60, `Revision:${kind}`);
  res.json({ ok: true });
});

progressRouter.get("/settings", async (_req, res) => {
  const profile = await ensureUserProfile();
  res.json({ profile });
});

progressRouter.put("/settings", async (req, res) => {
  const schema = z.object({
    displayName: z.string().min(1).max(60).optional(),
    theme: z.enum(["dark", "light"]).optional(),
    dailyTargetMinutes: z.number().int().min(15).max(480).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  await ensureUserProfile();
  const profile = await prisma.userProfile.update({
    where: { id: 1 },
    data: parsed.data,
  });
  res.json({ profile });
});

progressRouter.get("/export", async (_req, res) => {
  const [
    profile,
    topics,
    questions,
    codingStatus,
    codingSubmissions,
    outputs,
    comparisons,
    designs,
    solidModules,
    mocks,
    studyPlan,
    sessionLogs,
  ] = await Promise.all([
    ensureUserProfile(),
    prisma.topicProgress.findMany(),
    prisma.questionAttempt.findMany(),
    prisma.codingStatus.findMany(),
    prisma.codingSubmission.findMany(),
    prisma.outputAttempt.findMany(),
    prisma.comparisonProgress.findMany(),
    prisma.designProgress.findMany(),
    prisma.solidModuleProgress.findMany(),
    prisma.mockAttempt.findMany(),
    prisma.studyPlanDay.findMany(),
    prisma.studySessionLog.findMany(),
  ]);

  res.json({
    exportedAt: new Date().toISOString(),
    version: 1,
    data: {
      profile,
      topics,
      questions,
      codingStatus,
      codingSubmissions,
      outputs,
      comparisons,
      designs,
      solidModules,
      mocks,
      studyPlan,
      sessionLogs,
    },
  });
});

progressRouter.post("/import", async (req, res) => {
  const data = req.body?.data;
  if (!data || typeof data !== "object") {
    res.status(400).json({ error: "Invalid export JSON payload" });
    return;
  }

  await prisma.$transaction(async (tx) => {
    if (data.profile) {
      await tx.userProfile.upsert({
        where: { id: 1 },
        create: {
          id: 1,
          displayName: data.profile.displayName || "CSE Candidate",
          theme: data.profile.theme || "dark",
          dailyTargetMinutes: data.profile.dailyTargetMinutes || 75,
          streakCount: data.profile.streakCount || 0,
          lastStudyDate: data.profile.lastStudyDate || null,
          totalStudySeconds: data.profile.totalStudySeconds || 0,
        },
        update: {
          displayName: data.profile.displayName || "CSE Candidate",
          theme: data.profile.theme || "dark",
          dailyTargetMinutes: data.profile.dailyTargetMinutes || 75,
          streakCount: data.profile.streakCount || 0,
          lastStudyDate: data.profile.lastStudyDate || null,
          totalStudySeconds: data.profile.totalStudySeconds || 0,
        },
      });
    }

    for (const t of data.topics || []) {
      await tx.topicProgress.upsert({
        where: { topicId: t.topicId },
        create: {
          topicId: t.topicId,
          status: t.status,
          bookmarked: Boolean(t.bookmarked),
          needsRevision: Boolean(t.needsRevision),
          notes: t.notes || "",
          studySeconds: t.studySeconds || 0,
          lastStudiedAt: t.lastStudiedAt ? new Date(t.lastStudiedAt) : null,
        },
        update: {
          status: t.status,
          bookmarked: Boolean(t.bookmarked),
          needsRevision: Boolean(t.needsRevision),
          notes: t.notes || "",
          studySeconds: t.studySeconds || 0,
        },
      });
    }

    for (const q of data.questions || []) {
      await tx.questionAttempt.upsert({
        where: { questionId: q.questionId },
        create: {
          questionId: q.questionId,
          topicId: q.topicId,
          status: q.status,
          bookmarked: Boolean(q.bookmarked),
          needsRevision: Boolean(q.needsRevision),
          notes: q.notes || "",
          revisionStage: q.revisionStage || 0,
          nextRevisionAt: q.nextRevisionAt ? new Date(q.nextRevisionAt) : null,
          lastAttemptedAt: q.lastAttemptedAt ? new Date(q.lastAttemptedAt) : null,
        },
        update: {
          status: q.status,
          bookmarked: Boolean(q.bookmarked),
          needsRevision: Boolean(q.needsRevision),
          notes: q.notes || "",
          revisionStage: q.revisionStage || 0,
        },
      });
    }

    for (const c of data.codingStatus || []) {
      await tx.codingStatus.upsert({
        where: { problemId: c.problemId },
        create: {
          problemId: c.problemId,
          solved: Boolean(c.solved),
          bookmarked: Boolean(c.bookmarked),
          needsRevision: Boolean(c.needsRevision),
          savedCode: c.savedCode || "",
          notes: c.notes || "",
          lastSubmittedAt: c.lastSubmittedAt ? new Date(c.lastSubmittedAt) : null,
        },
        update: {
          solved: Boolean(c.solved),
          bookmarked: Boolean(c.bookmarked),
          needsRevision: Boolean(c.needsRevision),
          savedCode: c.savedCode || "",
          notes: c.notes || "",
        },
      });
    }

    for (const o of data.outputs || []) {
      await tx.outputAttempt.upsert({
        where: { puzzleId: o.puzzleId },
        create: {
          puzzleId: o.puzzleId,
          category: o.category,
          userPrediction: o.userPrediction || "",
          attempted: Boolean(o.attempted),
          isCorrect: Boolean(o.isCorrect),
          bookmarked: Boolean(o.bookmarked),
          needsRevision: Boolean(o.needsRevision),
          notes: o.notes || "",
          revisionStage: o.revisionStage || 0,
          nextRevisionAt: o.nextRevisionAt ? new Date(o.nextRevisionAt) : null,
          attemptedAt: o.attemptedAt ? new Date(o.attemptedAt) : null,
        },
        update: {
          userPrediction: o.userPrediction || "",
          attempted: Boolean(o.attempted),
          isCorrect: Boolean(o.isCorrect),
          bookmarked: Boolean(o.bookmarked),
          needsRevision: Boolean(o.needsRevision),
          notes: o.notes || "",
        },
      });
    }

    for (const d of data.designs || []) {
      await tx.designProgress.upsert({
        where: { designId: d.designId },
        create: {
          designId: d.designId,
          completed: Boolean(d.completed),
          bookmarked: Boolean(d.bookmarked),
          checklistJson: d.checklistJson || "{}",
          notes: d.notes || "",
        },
        update: {
          completed: Boolean(d.completed),
          bookmarked: Boolean(d.bookmarked),
          checklistJson: d.checklistJson || "{}",
          notes: d.notes || "",
        },
      });
    }

    for (const s of data.studyPlan || []) {
      await tx.studyPlanDay.upsert({
        where: { day: s.day },
        create: {
          day: s.day,
          completed: Boolean(s.completed),
          completedTasksJson: s.completedTasksJson || "{}",
          notes: s.notes || "",
          completedAt: s.completedAt ? new Date(s.completedAt) : null,
        },
        update: {
          completed: Boolean(s.completed),
          completedTasksJson: s.completedTasksJson || "{}",
          notes: s.notes || "",
        },
      });
    }
  });

  res.json({ ok: true });
});
