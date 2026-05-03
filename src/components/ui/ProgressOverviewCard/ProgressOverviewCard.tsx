import { GlassPanel } from "@components/ui/GlassPanel/GlassPanel";
import type { ProgressOverviewCardProps } from "./ProgressOverviewCard.types";
import "./ProgressOverviewCard.scss";

export const ProgressOverviewCard = ({
  progress,
}: ProgressOverviewCardProps) => {
  return (
    <GlassPanel className="progress-card" intensity="strong">
      <div className="progress-card__header">
        <div>
          <p className="progress-card__label">התקדמות פרויקט</p>
          <h3 className="progress-card__value">{progress}%</h3>
        </div>
        <span className="progress-card__badge">AI Ready</span>
      </div>
      <div className="progress-card__bar">
        <div
          className="progress-card__fill"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="progress-card__hint">יעד ביניים הבא: מודל זמין לבדיקות</p>
    </GlassPanel>
  );
};
