/**
 * Score calculation utility functions
 */

import type { ProjectTaskRecord } from "@services/firebase/firebase";
import type { MemberDirectoryUser } from "@services/firebase/firebase";
import {
  mockProjectMembers,
  scoringWeights,
  type MemberCompletionData,
  type ProjectMemberScore,
} from "./mockScoreData";

export type TaskDifficulty = "easy" | "medium" | "hard";

export const difficultyScore = {
  easy: 10,
  medium: 20,
  hard: 35,
} as const;

export type DifficultyScoreMap = typeof difficultyScore;

export interface ProjectMemberScoreWithTasks {
  id: string;
  name: string;
  photoURL?: string;
  totalScore: number;
  rank: number;
}

/**
 * Calculate total score for a single member based on their completion data
 */
export const calculateMemberScore = (
  member: MemberCompletionData
): number => {
  const score =
    member.completedTasks * scoringWeights.completedTask +
    member.completedSubtasks * scoringWeights.completedSubtask +
    member.milestonesReached * scoringWeights.milestoneReached +
    member.documentsContributed * scoringWeights.documentContribution +
    member.onTimeSubmissions * scoringWeights.onTimeSubmission +
    member.codeReviews * scoringWeights.codeReview;

  return Math.round(score);
};

/**
 * Get all project members with their calculated scores, sorted by score (descending)
 */
export const getProjectMembersWithScores = (): ProjectMemberScore[] => {
  return mockProjectMembers
    .map((member) => ({
      ...member,
      totalScore: calculateMemberScore(member),
    }))
    .sort((a, b) => b.totalScore - a.totalScore)
    .map((member, index) => ({
      ...member,
      rank: index + 1,
    }));
};

/**
 * Get the top N members by score
 */
export const getTopMembers = (limit: number = 3): ProjectMemberScore[] => {
  return getProjectMembersWithScores().slice(0, limit);
};

/**
 * Get a specific member's score by ID
 */
export const getMemberScoreById = (
  memberId: string,
): ProjectMemberScore | undefined => {
  const member = mockProjectMembers.find((m) => m.id === memberId);
  if (!member) return undefined;

  const allMembers = getProjectMembersWithScores();
  return allMembers.find((m) => m.id === memberId);
};

/**
 * Get member's rank (position in leaderboard)
 */
export const getMemberRank = (memberId: string): number | undefined => {
  const members = getProjectMembersWithScores();
  return members.find((m) => m.id === memberId)?.rank;
};

/**
 * Calculate the score of a task based on difficulty.
 */
export const calculateTaskScore = (task: ProjectTaskRecord): number => {
  if (task.status !== "completed") {
    return 0;
  }

  return difficultyScore[task.difficulty ?? "medium"];
};

/**
 * Calculate total score for the active project from completed tasks.
 */
export const calculateProjectScore = (
  tasks: ProjectTaskRecord[],
): number => {
  return tasks.reduce((total, task) => total + calculateTaskScore(task), 0);
};

/**
 * Calculate score for a specific user from completed tasks assigned to them.
 */
export const calculateUserScore = (
  tasks: ProjectTaskRecord[],
  userId: string,
): number => {
  return tasks
    .filter((task) => task.status === "completed" && task.assigneeIds.includes(userId))
    .reduce((total, task) => total + difficultyScore[task.difficulty ?? "medium"], 0);
};

/**
 * Build project member score from project tasks and member profiles.
 */
export const getProjectMemberScores = (
  tasks: ProjectTaskRecord[],
  members: MemberDirectoryUser[],
): ProjectMemberScoreWithTasks[] => {
  const memberById = new Map(members.map((member) => [member.uid, member]));
  const scoreByMember = new Map<string, number>();

  tasks.forEach((task) => {
    if (task.status !== "completed") {
      return;
    }

    const taskPoints = calculateTaskScore(task);
    task.assigneeIds.forEach((memberId) => {
      scoreByMember.set(
        memberId,
        (scoreByMember.get(memberId) ?? 0) + taskPoints,
      );
    });
  });

  const memberScores = members.map((member) => ({
    id: member.uid,
    name: member.displayName ?? member.email ?? member.uid,
    photoURL: member.photoURL ?? undefined,
    totalScore: scoreByMember.get(member.uid) ?? 0,
    rank: 0,
  }));

  return memberScores
    .sort((a, b) => b.totalScore - a.totalScore)
    .map((member, index) => ({
      ...member,
      rank: index + 1,
    }));
};

/**
 * Get top project members by score.
 */
export const getTopProjectMembers = (
  tasks: ProjectTaskRecord[],
  members: MemberDirectoryUser[],
  limit = 3,
): ProjectMemberScoreWithTasks[] => {
  return getProjectMemberScores(tasks, members).slice(0, limit);
};

/**
 * Get a specific project member score and rank.
 */
export const getProjectMemberScoreById = (
  tasks: ProjectTaskRecord[],
  members: MemberDirectoryUser[],
  memberId: string,
): ProjectMemberScoreWithTasks | undefined => {
  return getProjectMemberScores(tasks, members).find((member) => member.id === memberId);
};

/**
 * Get score statistics for the project
 */
export const getScoreStatistics = () => {
  const members = getProjectMembersWithScores();
  const scores = members.map((m) => m.totalScore);
  const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const maxScore = Math.max(...scores);
  const minScore = Math.min(...scores);

  return {
    averageScore: avgScore,
    maxScore,
    minScore,
    totalMembers: members.length,
  };
};
