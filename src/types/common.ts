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
  createdBy: string;
  memberIds: string[];
  teacherIds?: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  logoLink?: string;
  nextMilestoneAt?: Timestamp;
  finalSubmissionAt?: Timestamp;
  status?: "active" | "completed" | "archived";
};
