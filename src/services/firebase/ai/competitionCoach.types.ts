export interface CompetitionTaskSummary {
  id: string;
  title: string;
  priority: string;
  difficulty: string;
  status: string;
  dueDate?: string | null;
  assigneeNames: string[];
}

export interface CompetitionMemberSummary {
  id: string;
  name: string;
  totalScore: number;
  rank: number;
}

export interface CompetitionCoachInput {
  currentUser: CompetitionMemberSummary;
  leader: CompetitionMemberSummary;
  scoreGap: number;
  openTasks: CompetitionTaskSummary[];
  completedTasks: CompetitionTaskSummary[];
}

export interface CompetitionRecommendedTask {
  taskId?: string;
  title: string;
  reason: string;
}

export interface CompetitionCoachResult {
  headline: string;
  leaderName: string;
  scoreGap: number | string;
  recommendedTasks: CompetitionRecommendedTask[];
  strategy: [string, string, string];
  motivation: string;
}
