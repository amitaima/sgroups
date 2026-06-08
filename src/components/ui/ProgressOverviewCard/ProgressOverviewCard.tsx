import { GlassPanel } from "@components/ui/GlassPanel/GlassPanel";
import type { ProgressOverviewCardProps } from "./ProgressOverviewCard.types";
import "./ProgressOverviewCard.scss";

export const ProgressOverviewCard = ({
  progress,
  title = "התקדמות הפרויקט",
  hint = "המדד מתעדכן לפי נתוני הפרויקט",
  actions,
}: ProgressOverviewCardProps) => {
  return (
    <GlassPanel className="progress-card">
      <div className="progress-card__decor flex flex-col justify-between h-full">
        <div className="progress-card__header">
          <div className="progress-card__copy">
            <p className="progress-card__label">{title}</p>
            <h3 className="progress-card__value">{progress}%</h3>
          </div>
          {actions ? <div className="progress-card__actions">{actions}</div> : null}
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