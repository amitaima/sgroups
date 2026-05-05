import type { MemberAvatarItem } from "@components/users/MemberAvatarGroup";

export type TaskPriority = "high" | "medium" | "low";
export type TaskStatus = "todo" | "inProgress" | "review" | "completed";

export interface TaskCardData {
  id: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDateLabel: string;
  assignees: MemberAvatarItem[];
  overdue?: boolean;
  completed?: boolean;
}

export interface TaskCardProps {
  task: TaskCardData;
  isDragging?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
}
