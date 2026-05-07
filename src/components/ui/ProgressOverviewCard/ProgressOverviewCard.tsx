import { GlassPanel } from "@components/ui/GlassPanel/GlassPanel";
import type { ProgressOverviewCardProps } from "./ProgressOverviewCard.types";
import "./ProgressOverviewCard.scss";

export const ProgressOverviewCard = ({
  progress,
  title = "התקדמות פרויקט",
  subtitle = "מבט כללי על סטטוס העבודה",
  hint = "המדד מתעדכן לפי נתוני הפרויקט",
  badgeLabel = "מבט כללי",
}: ProgressOverviewCardProps) => {
  return (
    <GlassPanel className="progress-card">
      <div className="progress-card__decor flex flex-col justify-between h-full">
        <div className="progress-card__header">
          <div className="progress-card__copy">
            <p className="progress-card__label">{title}</p>
            <h3 className="progress-card__value">{progress}%</h3>
            {/* <p className="progress-card__subtitle">{subtitle}</p> */}
          </div>
          {/* <span className="progress-card__badge">{badgeLabel}</span> */}
        </div>
        <div>
          <div className="progress-card__bar">
            <div
              className="progress-card__fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="progress-card__hint">{hint}</p>
        </div>
      </div>
    </GlassPanel>
  );
};
