import { GlassPanel } from "@components/ui/GlassPanel/GlassPanel";
import type { OpenTasksCardProps } from "./OpenTasksCard.types";
import "./OpenTasksCard.scss";

export const OpenTasksCard = ({ tasks }: OpenTasksCardProps) => {
  return (
    <GlassPanel className="tasks-card">
      <h3 className="tasks-card__title">3 משימות פתוחות</h3>
      <ul className="tasks-card__list">
        {tasks.map((task) => (
          <li key={task} className="tasks-card__item">
            <span className="tasks-card__dot" />
            {task}
          </li>
        ))}
      </ul>
    </GlassPanel>
  );
};
