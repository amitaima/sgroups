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
  memberProfiles?: ProjectTaskAutomationMemberProfile[];
  finalSubmissionAt?: Date | null;
}

export interface ProjectTaskAutomationMemberProfile {
  id: string;
  displayName?: string | null;
  email?: string | null;
  role?: string | null;
  academicProfile?: {
    university?: string;
    department?: string;
    studyYear?: string;
  };
  collaborationProfile?: {
    skills?: string;
    learningGoals?: string;
    availability?: string;
    taskPreferences?: string;
  };
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
