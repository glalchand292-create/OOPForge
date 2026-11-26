-- CreateTable
CREATE TABLE "UserProfile" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "displayName" TEXT NOT NULL DEFAULT 'CSE Candidate',
    "theme" TEXT NOT NULL DEFAULT 'dark',
    "dailyTargetMinutes" INTEGER NOT NULL DEFAULT 75,
    "streakCount" INTEGER NOT NULL DEFAULT 0,
    "lastStudyDate" TEXT,
    "totalStudySeconds" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TopicProgress" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "topicId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Not Started',
    "bookmarked" BOOLEAN NOT NULL DEFAULT false,
    "needsRevision" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT NOT NULL DEFAULT '',
    "studySeconds" INTEGER NOT NULL DEFAULT 0,
    "lastStudiedAt" DATETIME,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "QuestionAttempt" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "questionId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Untouched',
    "bookmarked" BOOLEAN NOT NULL DEFAULT false,
    "needsRevision" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT NOT NULL DEFAULT '',
    "revisionStage" INTEGER NOT NULL DEFAULT 0,
    "nextRevisionAt" DATETIME,
    "lastAttemptedAt" DATETIME,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CodingStatus" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "problemId" TEXT NOT NULL,
    "solved" BOOLEAN NOT NULL DEFAULT false,
    "bookmarked" BOOLEAN NOT NULL DEFAULT false,
    "needsRevision" BOOLEAN NOT NULL DEFAULT false,
    "savedCode" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "lastSubmittedAt" DATETIME,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CodingSubmission" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "problemId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "stdout" TEXT NOT NULL DEFAULT '',
    "stderr" TEXT NOT NULL DEFAULT '',
    "runtimeMs" INTEGER NOT NULL DEFAULT 0,
    "passed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "OutputAttempt" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "puzzleId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "userPrediction" TEXT NOT NULL DEFAULT '',
    "attempted" BOOLEAN NOT NULL DEFAULT false,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "bookmarked" BOOLEAN NOT NULL DEFAULT false,
    "needsRevision" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT NOT NULL DEFAULT '',
    "revisionStage" INTEGER NOT NULL DEFAULT 0,
    "nextRevisionAt" DATETIME,
    "attemptedAt" DATETIME,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ComparisonProgress" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "comparisonId" TEXT NOT NULL,
    "bookmarked" BOOLEAN NOT NULL DEFAULT false,
    "revised" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT NOT NULL DEFAULT '',
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DesignProgress" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "designId" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "bookmarked" BOOLEAN NOT NULL DEFAULT false,
    "checklistJson" TEXT NOT NULL DEFAULT '{}',
    "notes" TEXT NOT NULL DEFAULT '',
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SolidModuleProgress" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "moduleId" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "solvedPracticeJson" TEXT NOT NULL DEFAULT '{}',
    "notes" TEXT NOT NULL DEFAULT '',
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MockAttempt" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "roundId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "maxScore" INTEGER NOT NULL DEFAULT 100,
    "durationSeconds" INTEGER NOT NULL DEFAULT 0,
    "answersJson" TEXT NOT NULL,
    "topicBreakdownJson" TEXT NOT NULL,
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "StudyPlanDay" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "day" INTEGER NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedTasksJson" TEXT NOT NULL DEFAULT '{}',
    "notes" TEXT NOT NULL DEFAULT '',
    "completedAt" DATETIME,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "StudySessionLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "dateKey" TEXT NOT NULL,
    "minutes" INTEGER NOT NULL,
    "module" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "TopicProgress_topicId_key" ON "TopicProgress"("topicId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionAttempt_questionId_key" ON "QuestionAttempt"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "CodingStatus_problemId_key" ON "CodingStatus"("problemId");

-- CreateIndex
CREATE UNIQUE INDEX "OutputAttempt_puzzleId_key" ON "OutputAttempt"("puzzleId");

-- CreateIndex
CREATE UNIQUE INDEX "ComparisonProgress_comparisonId_key" ON "ComparisonProgress"("comparisonId");

-- CreateIndex
CREATE UNIQUE INDEX "DesignProgress_designId_key" ON "DesignProgress"("designId");

-- CreateIndex
CREATE UNIQUE INDEX "SolidModuleProgress_moduleId_key" ON "SolidModuleProgress"("moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "StudyPlanDay_day_key" ON "StudyPlanDay"("day");
