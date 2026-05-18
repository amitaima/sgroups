import type { Dispatch, FormEventHandler, SetStateAction } from "react";
import type { TaskPriority, TaskStatus } from "../../../types/common";

export type TaskDialogMode = "create" | "edit";

export interface TaskDialogDraft {
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string;
  assigneeIds: string[];
}

export interface TaskAssigneeOption {
  id: string;
  displayName?: string | null;
  email: string | null;
  photoURL?: string | null;
}

export interface TaskDialogProps {
  isOpen: boolean;
  mode: TaskDialogMode;
  draft: TaskDialogDraft;
  setDraft: Dispatch<SetStateAction<TaskDialogDraft>>;
  statusOptions: TaskStatus[];
  statusLabels: Record<TaskStatus, string>;
  priorityLabels: Record<TaskPriority, string>;
  assigneeOptions: TaskAssigneeOption[];
  currentTaskMembers?: TaskAssigneeOption[];
  onToggleAssignee: (memberId: string) => void;
  onClose: () => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
  error?: string | null;
  isSaving?: boolean;
}
