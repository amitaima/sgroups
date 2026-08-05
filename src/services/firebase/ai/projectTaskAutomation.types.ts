import type {
  TaskDifficulty,
  TaskPriority,
  TaskStatus,
} from "../../../types/common";

export interface ProjectTaskAutomationInput {
  projectName: string;
  projectDescription?: string | null;
  projectInstructions?: string | null;
  projectMemberIds?: string[];
  finalSubmissionAt?: Date | null;
}

export interface ProjectTaskDifficultyEstimate {
  difficulty: number;
}

export interface ProjectTaskAutomationTask {
  title: string;
  description: string;
  priority: TaskPriority;
  difficulty: TaskDifficulty;
  status: TaskStatus;
  assigneeIds: string[];
  dueDate: Date | null;
  completed: boolean;
}

export interface ProjectTaskAutomationResult {
  difficulty: number;
  taskCount: number;
  tasks: ProjectTaskAutomationTask[];
}
