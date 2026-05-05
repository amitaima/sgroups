import type { MemberAvatarItem } from "@components/users/MemberAvatarGroup";
import type { TaskCardData, TaskStatus } from "@components/dashboard/TaskCard";

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

export interface TaskMember extends MemberAvatarItem {}
