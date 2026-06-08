import {
  CalendarDays,
  CheckCircle2,
  MoreHorizontal,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { GlassPanel } from "@components/ui/GlassPanel/GlassPanel";
import { MemberAvatarGroup } from "@components/users/MemberAvatarGroup";
import type { TaskCardProps } from "./TaskCard.types";
import "./TaskCard.scss";

const PRIORITY_LABELS: Record<TaskCardProps["task"]["priority"], string> = {
  high: "HIGH",
  medium: "MEDIUM",
  low: "LOW",
};

export const TaskCard = ({
  task,
  isDragging,
  onClick,
  onContextMenu,
  onDragStart,
  onDragEnd,
  onDelete,
  isDeleting,
}: TaskCardProps & {
  isDragging?: boolean;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
}) => {
  const isCompleted = task.completed || task.status === "completed";
  const classNames = [
    "task-card",
    task.overdue ? "task-card--overdue" : "",
    isCompleted ? "task-card--completed" : "",
    onClick ? "task-card--interactive" : "",
    isDragging ? "task-card--dragging" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!onClick) {
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick(event as unknown as React.MouseEvent<HTMLDivElement>);
    }
  };

  return (
    <GlassPanel
      className={classNames}
      intensity="strong"
      draggable={Boolean(onDragStart)}
      onDragStart={(e) => onDragStart && onDragStart(e)}
      onDragEnd={(e) => onDragEnd && onDragEnd(e)}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onContextMenu={onContextMenu}
      onKeyDown={handleKeyDown}
    >
      <div className="task-card__top">
        <span
          className={`task-card__priority task-card__priority--${task.priority}`}
        >
          {PRIORITY_LABELS[task.priority]}
        </span>
        <span className={`task-card__difficulty task-card__difficulty--${task.difficulty}`}>
          {task.difficulty === "easy" ? "קל" : task.difficulty === "hard" ? "קשה" : "בינוני"}
        </span>
        <div className="task-card__top-actions">
          {isCompleted ? (
            <CheckCircle2
              size={18}
              strokeWidth={2.1}
              className="task-card__status"
            />
          ) : task.overdue ? (
            <span className="task-card__overdue-pill">
              <TriangleAlert size={14} strokeWidth={2.25} />
              באיחור
            </span>
          ) : null}
          {onDelete ? (
            <button
              className="task-card__delete"
              type="button"
              disabled={isDeleting}
              aria-label={`מחיקת המשימה ${task.title}`}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onDelete(task.id);
              }}
            >
              <Trash2 size={16} strokeWidth={2.1} />
            </button>
          ) : null}
        </div>
      </div>

      <div className="task-card__body">
        <h4 className="task-card__title">{task.title}</h4>
        {task.description ? (
          <p className="task-card__description">{task.description}</p>
        ) : null}
      </div>

      <div className="task-card__footer">
        <MemberAvatarGroup members={task.assignees} maxVisible={2} size="sm" />
        <div className="task-card__due">
          <CalendarDays size={14} strokeWidth={2} />
          <span>{task.dueDateLabel}</span>
        </div>
      </div>
    </GlassPanel>
  );
};
