export type TaskSuggestionPriority = "high" | "medium" | "low";
export type TaskSuggestionDifficulty = "easy" | "medium" | "hard";

export interface TaskSuggestionTaskSummary {
  title: string;
  dueDate?: string | null;
}

export interface TaskSuggestionResult {
  description: [string, string, string];
  suggestedApproach: [string] | [string, string];
  priority: TaskSuggestionPriority;
  difficulty: TaskSuggestionDifficulty;
  recommendedDueDate: string;
  reason: string;
}
