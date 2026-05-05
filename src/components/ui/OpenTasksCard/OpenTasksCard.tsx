import { GlassPanel } from "@components/ui/GlassPanel/GlassPanel";
import type { OpenTasksCardProps } from "./OpenTasksCard.types";
import "./OpenTasksCard.scss";

export const OpenTasksCard = ({ tasks }: OpenTasksCardProps) => {
  return (
    <GlassPanel className="tasks-card">
      <div className="tasks-card__header">
        <div>
          <p className="tasks-card__eyebrow">Top tasks</p>
          <h3 className="tasks-card__title">משימות פתוחות</h3>
        </div>
        <button
          className="tasks-card__menu"
          type="button"
          aria-label="אפשרויות משימות"
        >
          •••
        </button>
      </div>
      <ul className="tasks-card__list">
        {tasks.map((task) => (
          <li key={task} className="tasks-card__item">
            <span className="tasks-card__checkbox" aria-hidden="true" />
            <span className="tasks-card__content">
              <span className="tasks-card__task">{task}</span>
              <span className="tasks-card__hint">ממתין לאישור</span>
            </span>
          </li>
        ))}
      </ul>
    </GlassPanel>
  );
};
