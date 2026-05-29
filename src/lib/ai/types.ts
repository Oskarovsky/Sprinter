export type AiSource = "ai" | "fallback";

export interface DraftTaskDraft {
  title: string;
  description: string;
  acceptanceCriteria: string[];
  openQuestions: string[];
}

export interface DraftInput {
  notes: string;
}

export interface DraftResult {
  source: AiSource;
  warning?: string;
  drafts: DraftTaskDraft[];
}

export interface CoachInput {
  taskTitle: string;
  taskDescription?: string;
  votes: number[];
}

export interface CoachResult {
  source: AiSource;
  warning?: string;
  summary: string;
  questions: string[];
}

export interface OpenRouterDraftResponse {
  drafts: DraftTaskDraft[];
}

export interface OpenRouterCoachResponse {
  summary: string;
  questions: string[];
}
