import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONTENT_DIR = path.resolve(__dirname, "../../../content");

function loadJson<T>(fileName: string): T {
  const fullPath = path.join(CONTENT_DIR, fileName);
  return JSON.parse(fs.readFileSync(fullPath, "utf-8")) as T;
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

export interface SolidAndModernContent {
  solid: SolidPrinciple[];
  ruleOf350Markdown: string;
  copyAssignmentMarkdown: string;
  inlineStaticMarkdown: string;
}

export interface MockQuestion {
  number: number;
  type: "Theory" | "Output" | "Coding" | "Design";
  prompt: string;
  code: string;
  answerKey: string;
}

export interface MockRound {
  id: string;
  roundNumber: number;
  title: string;
  difficulty: string;
  durationMinutes: number;
  questions: MockQuestion[];
}

export interface StudyDay {
  day: number;
  week: string;
  summary: string;
  tasks: { id: string; label: string }[];
}

export const contentStore = {
  topics: loadJson<TopicItem[]>("topics.json"),
  theoryQuestions: loadJson<TheoryQuestion[]>("theoryQuestions.json"),
  outputPuzzles: loadJson<OutputPuzzle[]>("outputPuzzles.json"),
  codingProblems: loadJson<CodingProblem[]>("codingProblems.json"),
  comparisons: loadJson<ComparisonItem[]>("comparisons.json"),
  designs: loadJson<DesignProblem[]>("designs.json"),
  solidAndModern: loadJson<SolidAndModernContent>("solidAndModern.json"),
  mockInterviews: loadJson<MockRound[]>("mockInterviews.json"),
  studyPlan: loadJson<StudyDay[]>("studyPlan.json"),
};
