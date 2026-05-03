import { GlassPanel } from "@components/ui/GlassPanel/GlassPanel";
import type { TaskDistributionCardProps } from "./TaskDistributionCard.types";
import "./TaskDistributionCard.scss";

export const TaskDistributionCard = ({ data }: TaskDistributionCardProps) => {
  return (
    <GlassPanel className="distribution-card">
      <h3 className="distribution-card__title">חלוקת משימות</h3>
      <div className="distribution-card__list">
        {data.map((item) => (
          <div key={item.name} className="distribution-card__row">
            <div className="distribution-card__label">{item.name}</div>
            <div className="distribution-card__bar">
              <div
                className="distribution-card__fill"
                style={{ width: `${item.value}%` }}
              />
            </div>
            <span className="distribution-card__value">{item.value}%</span>
          </div>
        ))}
      </div>
    </GlassPanel>
  );
};
