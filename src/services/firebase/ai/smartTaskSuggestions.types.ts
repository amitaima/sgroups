import type { TaskPriority, TaskDifficulty, TaskStatus } from "../../../types/common";

export interface SmartTaskSuggestionsInput {
  projectName: string;
  projectDescription?: string | null;
  projectInstructions?: string | null;
  existingTasks: { title: string; status: TaskStatus }[];
  deadlines: { label: string; date: string }[];
  memberScores: { id: string; name: string; score: number }[];
}

export interface SmartTaskSuggestion {
  title: string;
  description: string;
  priority: TaskPriority;
  difficulty: TaskDifficulty;
  suggestedAssigneeId: string;
  reason: string;
}

export type SmartTaskSuggestionsResult = [SmartTaskSuggestion, SmartTaskSuggestion, SmartTaskSuggestion];
