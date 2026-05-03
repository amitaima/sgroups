import { GlassPanel } from "@components/ui/GlassPanel/GlassPanel";
import type { DeadlineCardProps } from "./DeadlineCard.types";
import "./DeadlineCard.scss";

export const DeadlineCard = ({
  title,
  value,
  hint,
  tone = "primary",
}: DeadlineCardProps) => {
  return (
    <GlassPanel className={`deadline-card deadline-card--${tone}`}>
      <p className="deadline-card__title">{title}</p>
      <div className="deadline-card__value">{value}</div>
      {hint ? <p className="deadline-card__hint">{hint}</p> : null}
    </GlassPanel>
  );
};
