import type { MemberAvatarItem } from "@components/users/MemberAvatarGroup";
import type { TaskDifficulty, TaskPriority, TaskStatus } from "../../../types/common";

export interface TaskCardData {
  id: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  difficulty: TaskDifficulty;
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
  onContextMenu?: React.MouseEventHandler<HTMLDivElement>;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onDelete?: (taskId: string) => void;
  isDeleting?: boolean;
}
