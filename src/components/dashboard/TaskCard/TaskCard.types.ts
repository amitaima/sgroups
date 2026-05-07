import type { MemberAvatarItem } from "@components/users/MemberAvatarGroup";
import type { TaskPriority, TaskStatus } from "../../../types/common";

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
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
}
