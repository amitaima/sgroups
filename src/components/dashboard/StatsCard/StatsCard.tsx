import type { StatsCardProps } from "./StatsCard.types";
import { GlassPanel } from "@components/ui/GlassPanel/GlassPanel";
import "./StatsCard.scss";

export const StatsCard = ({ label, value, helper }: StatsCardProps) => {
  return (
    <GlassPanel className="stats-card">
      <p className="stats-card__label">{label}</p>
      <div className="stats-card__value">{value}</div>
      {helper ? <p className="stats-card__helper">{helper}</p> : null}
    </GlassPanel>
  );
};
