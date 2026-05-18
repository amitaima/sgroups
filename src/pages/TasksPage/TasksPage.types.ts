import type { MemberAvatarItem } from "@components/users/MemberAvatarGroup";
import type { TaskCardData, TaskStatus } from "@components/dashboard/TaskCard";
import type { TaskPriority, TaskDifficulty } from "../../types/common";

export interface TaskBoardColumnData {
  id: TaskStatus;
  title: string;
  count: number;
  tone: "neutral" | "teal" | "olive" | "primary";
  tasks: TaskCardData[];
}

export interface TasksPageViewModel {
  columns: TaskBoardColumnData[];
  boardToggle: "board" | "list";
}

export interface TaskDialogDraft {
  title: string;
  description: string;
  priority: TaskPriority;
  difficulty: TaskDifficulty;
  status: TaskStatus;
  dueDate: string;
  assigneeIds: string[];
}

export interface TaskAssigneeOption extends MemberAvatarItem {
  email: string | null;
}

export interface TaskMember extends MemberAvatarItem {}
