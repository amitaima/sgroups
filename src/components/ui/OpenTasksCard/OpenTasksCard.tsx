import { Check } from "lucide-react";
import { GlassPanel } from "@components/ui/GlassPanel/GlassPanel";
import type { OpenTasksCardProps } from "./OpenTasksCard.types";
import "./OpenTasksCard.scss";

export const OpenTasksCard = ({
  tasks,
  actions,
  emptyState = "אין משימות פתוחות עדיין.",
  updatingTaskId,
  onToggleTask,
}: OpenTasksCardProps) => {
  return (
    <GlassPanel className="tasks-card">
      <div className="tasks-card__header">
        <div>
          <p className="tasks-card__eyebrow">Top tasks</p>
          <h3 className="tasks-card__title">משימות פתוחות</h3>
        </div>
        {actions ?? null}
      </div>

      {tasks.length > 0 ? (
        <ul className="tasks-card__list">
          {tasks.map((task) => {
            const isUpdating = updatingTaskId === task.id;

            return (
              <li key={task.id} className="tasks-card__item">
                <label className="tasks-card__checkbox-wrap">
                  <input
                    className="tasks-card__checkbox-input"
                    type="checkbox"
                    checked={task.completed}
                    disabled={isUpdating}
                    onChange={(event) => {
                      void onToggleTask?.(task.id, event.target.checked);
                    }}
                    aria-label={`סימון ${task.title}`}
                  />
                  <span className="tasks-card__checkbox" aria-hidden="true">
                    {task.completed ? (
                      <Check size={12} strokeWidth={3} />
                    ) : null}
                  </span>
                </label>

                <span className="tasks-card__content">
                  <span className="tasks-card__task">{task.title}</span>
                  <span className="tasks-card__hint">
                    {task.dueDateLabel ?? "ללא מועד מוגדר"}
                  </span>
                </span>

                {isUpdating ? (
                  <span className="tasks-card__saving">שמירה...</span>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="tasks-card__empty">{emptyState}</p>
      )}
    </GlassPanel>
  );
};
