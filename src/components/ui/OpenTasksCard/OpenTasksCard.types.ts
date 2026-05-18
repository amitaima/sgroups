import type { ReactNode } from "react";

export interface OpenTaskItem {
  id: string;
  title: string;
  completed: boolean;
  dueDateLabel?: string;
}

export interface OpenTasksCardProps {
  tasks: OpenTaskItem[];
  actions?: ReactNode;
  emptyState?: string;
  updatingTaskId?: string | null;
  onTaskClick?: (taskId: string) => void;
  onToggleTask?: (
    taskId: string,
    nextCompleted: boolean,
  ) => void | Promise<void>;
}
