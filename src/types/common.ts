/* Generic application types */

import type { Timestamp } from "firebase/firestore";

export interface ApiResponse<T> {
  data: T;
  error?: string;
  isLoading?: boolean;
}

export interface PageMeta {
  title: string;
  description?: string;
}

export type Project = {
  id: string;
  name: string;
  description?: string;
  dueDate?: Timestamp;
  finalSubmissionAt?: Timestamp;
  nextMilestoneAt?: Timestamp;
  projectType?: ProjectType;
  courseName?: string;
  institutionName?: string;
  lecturerName?: string;
  courseCode?: string;
  semesterLabel?: string;
  groupNumber?: string;
  importantLinks?: ProjectLink[];
  milestones?: ProjectMilestone[];
  notificationSettings?: ProjectNotificationSettings;
  memberRoles?: Record<string, ProjectMemberRole>;
  createdBy: string;
  memberIds: string[];
  teacherIds?: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  logoLink?: string;
  status?: "active" | "completed" | "archived";
};

export type ProjectStatus = "active" | "completed" | "archived";

export type ProjectType =
  | "seminar"
  | "assignment"
  | "presentation"
  | "research"
  | "lab";

export type ProjectMemberRole = "owner" | "admin" | "member";

export interface ProjectMilestone {
  id: string;
  title: string;
  dueDate: Timestamp;
  completed?: boolean;
}

export interface ProjectLink {
  id: string;
  label: string;
  url: string;
}

export interface ProjectNotificationSettings {
  email?: boolean;
  reminders?: boolean;
  mentions?: boolean;
}
