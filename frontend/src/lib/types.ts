export interface UserProfile {
  id: number;
  displayName: string;
  theme: "dark" | "light";
  dailyTargetMinutes: number;
  streakCount: number;
  lastStudyDate: string | null;
  totalStudySeconds: number;
}

export interface TopicQA {
  id: string;
  level: string;
  difficulty: string;
  question: string;
  answer: string;
  technicalExplanation: string;
  example: string;
  commonMistake: string;
  followUp: string;
}

export interface TopicProgress {
  topicId: string;
  status: "Not Started" | "In Progress" | "Completed" | "Needs Revision";
  bookmarked: boolean;
  needsRevision: boolean;
  notes: string;
  studySeconds: number;
  lastStudiedAt: string | null;
}

export interface TopicItem {
  id: string;
  number: number;
  title: string;
  chapterId: number;
  chapterTitle: string;
  difficulty: string;
  analogy: string;
  simpleExplanation: string;
  technicalExplanation: string;
  definitions: string[];
  cppExamples: string[];
  interviewTraps: string[];
  commonMistakes: string[];
  questions: TopicQA[];
  relatedTheoryIds: string[];
  relatedOutputIds: string[];
  relatedCodingIds: string[];
  relatedComparisonIds: string[];
  progress: TopicProgress;
}

export interface QuestionAttempt {
  questionId: string;
  topicId: string;
  status: "Untouched" | "Solved" | "Incorrect" | "Skipped";
  bookmarked: boolean;
  needsRevision: boolean;
  notes: string;
  revisionStage: number;
  nextRevisionAt: string | null;
  lastAttemptedAt: string | null;
}

export interface TheoryQuestion {
  id: string;
  source: string;
  number: number;
  category: string;
  topicId: string;
  difficulty: string;
  question: string;
  hint: string;
  answer: string;
  explanation: string;
  followUp: string;
  attempt: QuestionAttempt;
}

export interface CodingStatus {
  problemId: string;
  solved: boolean;
  bookmarked: boolean;
  needsRevision: boolean;
  savedCode: string;
  notes: string;
  lastSubmittedAt: string | null;
}

export interface CodingSubmission {
  id: number;
  problemId: string;
  code: string;
  status: string;
  stdout: string;
  stderr: string;
  runtimeMs: number;
  passed: boolean;
  createdAt: string;
}

export interface SandboxExecutionResult {
  sandboxAvailable: boolean;
  compiled: boolean;
  status:
    | "Passed"
    | "Wrong Answer"
    | "Compile Error"
    | "Runtime Error"
    | "Time Limit Exceeded"
    | "Sandbox Blocked"
    | "Sandbox Unavailable";
  stdout: string;
  stderr: string;
  compileOutput: string;
  runtimeMs: number;
  passed: boolean;
}

export interface CodingProblem {
  id: string;
  number: number;
  title: string;
  difficulty: string;
  concepts: string[];
  topicId: string;
  problemStatement: string;
  exampleOutput: string;
  constraints: string;
  hint: string;
  referenceSolution: string;
  starterCode: string;
  explanation: string;
  dryRun: string;
  complexity: string;
  commonMistakes: string;
  followUp: string;
  expectedStdout: string;
  status: CodingStatus;
}

export interface OutputAttempt {
  puzzleId: string;
  category: string;
  userPrediction: string;
  attempted: boolean;
  isCorrect: boolean;
  bookmarked: boolean;
  needsRevision: boolean;
  notes: string;
  revisionStage: number;
  nextRevisionAt: string | null;
  attemptedAt: string | null;
}

export interface OutputPuzzle {
  id: string;
  number: number;
  title: string;
  category: string;
  topicId: string;
  code: string;
  hint: string;
  concepts: string;
  isUndefinedBehavior: boolean;
  isCompileError: boolean;
  expectedOutput: string;
  rawOutputExplanation: string;
  lineByLine: string;
  whyIncorrect: string;
  interviewTrap: string;
  attempt: OutputAttempt;
}

export interface ComparisonProgress {
  comparisonId: string;
  bookmarked: boolean;
  revised: boolean;
  notes: string;
}

export interface ComparisonItem {
  id: string;
  number: number;
  title: string;
  topicId: string;
  headers: string[];
  rows: string[][];
  codeExample: string;
  note: string;
  progress: ComparisonProgress;
}

export interface DesignProgress {
  designId: string;
  completed: boolean;
  bookmarked: boolean;
  checklistJson: string;
  notes: string;
}

export interface DesignProblem {
  id: string;
  number: number;
  title: string;
  difficulty: string;
  requirements: string;
  classesRequired: string;
  relationships: string;
  oopConcepts: string;
  responsibilities: string;
  umlDiagram: string;
  cppApproach: string;
  cppSnippet: string;
  followUps: string;
  progress: DesignProgress;
}

export interface SolidPrinciple {
  id: string;
  code: string;
  title: string;
  simpleExplanation: string;
  whyItExists: string;
  badCode: string;
  whatsWrong: string;
  improvedCode: string;
  improvementExplanation: string;
  analogy: string;
  violations: string;
  questions: { question: string; answer: string }[];
  practiceProblems: { title: string; prompt: string; solution: string }[];
}

export interface SolidModuleProgress {
  moduleId: string;
  completed: boolean;
  solvedPracticeJson: string;
  notes: string;
}

export interface SolidAndModernContent {
  solid: SolidPrinciple[];
  ruleOf350Markdown: string;
  copyAssignmentMarkdown: string;
  inlineStaticMarkdown: string;
}

export interface MockAttempt {
  id: number;
  roundId: string;
  roundNumber: number;
  score: number;
  maxScore: number;
  durationSeconds: number;
  answersJson: string;
  topicBreakdownJson: string;
  submittedAt: string;
}

export interface MockRoundSummary {
  id: string;
  roundNumber: number;
  title: string;
  difficulty: string;
  durationMinutes: number;
  questionCount: number;
  attempts: MockAttempt[];
}

export interface MockRoundDetail {
  id: string;
  roundNumber: number;
  title: string;
  difficulty: string;
  durationMinutes: number;
  questions: {
    number: number;
    type: "Theory" | "Output" | "Coding" | "Design";
    prompt: string;
    code: string;
  }[];
}

export interface StudyDay {
  day: number;
  week: string;
  summary: string;
  tasks: { id: string; label: string }[];
  progress: {
    day: number;
    completed: boolean;
    completedTasksJson: string;
    notes: string;
    completedAt: string | null;
  };
}

export interface DashboardData {
  profile: UserProfile;
  stats: {
    overallCompletionPct: number;
    topicsCompleted: number;
    topicsInProgress: number;
    totalTopics: number;
    questionsSolved: number;
    totalQuestions: number;
    codingSolved: number;
    totalCoding: number;
    outputsAttempted: number;
    outputsCorrect: number;
    totalOutputs: number;
    designsCompleted: number;
    totalDesigns: number;
    planDaysCompleted: number;
    totalPlanDays: number;
    streakCount: number;
    totalStudySeconds: number;
    dailyTargetMinutes: number;
    todayMinutes: number;
    pendingRevisionsCount: number;
  };
  recentlyStudiedTopics: {
    topicId: string;
    title: string;
    status: string;
    lastStudiedAt: string;
  }[];
  weakestTopics: {
    topicId: string;
    title: string;
    incorrectCount: number;
    needsRevision: boolean;
  }[];
  studyActivity: { date: string; minutes: number }[];
  chapters: { chapterId: number; title: string; total: number; completed: number }[];
  recentMocks: MockAttempt[];
}
