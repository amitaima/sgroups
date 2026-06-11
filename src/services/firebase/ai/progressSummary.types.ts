import type { CompetitionTaskSummary } from "./competitionCoach.types";

export interface ProjectProgressSummaryInput {
  project: {
    name: string;
    description?: string | null;
    progress: number;
  };
  completedTasks: CompetitionTaskSummary[];
  openTasks: CompetitionTaskSummary[];
  inProgressTasks: CompetitionTaskSummary[];
  projectDescription?: string | null;
  projectInstructions?: string | null;
}

export interface ProjectProgressSummaryResult {
  headline: string;
  summaryLines: [string, string, string];
  completedHighlights: string[];
  nextFocus: string;
  motivation: string;
  progressPercent: number;
}