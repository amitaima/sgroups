export interface UserActivityProjectSummary {
  id: string;
  name: string;
  description?: string | null;
  updatedAt: string;
}

export interface UserActivityTaskSummary {
  id: string;
  projectName: string;
  title: string;
  status: string;
  priority: string;
  difficulty: string;
  dueDate?: string | null;
  updatedAt: string;
  createdByCurrentUser: boolean;
  assignedToCurrentUser: boolean;
}

export interface UserActivitySummaryInput {
  userName: string;
  previousLoginAt: string;
  currentLoginAt: string;
  updatedProjects: UserActivityProjectSummary[];
  createdTasks: UserActivityTaskSummary[];
  updatedTasks: UserActivityTaskSummary[];
  completedTasks?: UserActivityTaskSummary[];
  recentTasks?: UserActivityTaskSummary[];
}

export interface UserActivitySummaryResult {
  headline: string;
  summaryLines: string[];
  highlights: string[];
  nextFocus: string;
}
