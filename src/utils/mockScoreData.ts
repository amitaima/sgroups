/**
 * Mock data for gamified scoring system
 * Contains project members with their completion data
 */

export interface MemberCompletionData {
  id: string;
  name: string;
  email: string;
  photoURL?: string;
  completedTasks: number;
  completedSubtasks: number;
  milestonesReached: number;
  documentsContributed: number;
  onTimeSubmissions: number;
  codeReviews: number;
}

export interface ProjectMemberScore extends MemberCompletionData {
  totalScore: number;
  rank?: number;
}

// Mock project members with their completion data
export const mockProjectMembers: MemberCompletionData[] = [
  {
    id: "user1",
    name: "אלי כהן",
    email: "eli.cohen@example.com",
    photoURL: "https://i.pravatar.cc/150?img=1",
    completedTasks: 12,
    completedSubtasks: 45,
    milestonesReached: 3,
    documentsContributed: 8,
    onTimeSubmissions: 15,
    codeReviews: 6,
  },
  {
    id: "user2",
    name: "דנה לוי",
    email: "dana.levi@example.com",
    photoURL: "https://i.pravatar.cc/150?img=2",
    completedTasks: 10,
    completedSubtasks: 38,
    milestonesReached: 2,
    documentsContributed: 5,
    onTimeSubmissions: 12,
    codeReviews: 4,
  },
  {
    id: "user3",
    name: "דוד שמור",
    email: "david.shamur@example.com",
    photoURL: "https://i.pravatar.cc/150?img=3",
    completedTasks: 14,
    completedSubtasks: 52,
    milestonesReached: 4,
    documentsContributed: 7,
    onTimeSubmissions: 14,
    codeReviews: 8,
  },
  {
    id: "user4",
    name: "שרה ישראלי",
    email: "sarah.israeli@example.com",
    photoURL: "https://i.pravatar.cc/150?img=4",
    completedTasks: 9,
    completedSubtasks: 32,
    milestonesReached: 2,
    documentsContributed: 6,
    onTimeSubmissions: 9,
    codeReviews: 3,
  },
  {
    id: "user5",
    name: "מוחמד אחמד",
    email: "mohammad.ahmad@example.com",
    photoURL: "https://i.pravatar.cc/150?img=5",
    completedTasks: 11,
    completedSubtasks: 40,
    milestonesReached: 3,
    documentsContributed: 9,
    onTimeSubmissions: 11,
    codeReviews: 5,
  },
];

/**
 * Scoring weights for different achievement types
 * Adjust these values to change the scoring system
 */
export const scoringWeights = {
  completedTask: 10, // Base points for completing a task
  completedSubtask: 3, // Points per subtask
  milestoneReached: 50, // Bonus for reaching milestones
  documentContribution: 8, // Points for document contributions
  onTimeSubmission: 15, // Bonus for on-time submissions
  codeReview: 12, // Points for code reviews conducted
};
