import { GlassPanel } from "@components/ui/GlassPanel/GlassPanel";
import type { TaskDistributionCardProps } from "./TaskDistributionCard.types";
import "./TaskDistributionCard.scss";

const CHART_COLORS = ["#356669", "#8f4e10", "#576151", "#c0c8c8"];

export const TaskDistributionCard = ({ data }: TaskDistributionCardProps) => {
  const gradientStops = data.reduce<
    { start: number; end: number; color: string }[]
  >((segments, item, index) => {
    const start = segments.length === 0 ? 0 : segments[segments.length - 1].end;
    const end = start + item.value;
    segments.push({
      start,
      end,
      color: CHART_COLORS[index % CHART_COLORS.length],
    });
    return segments;
  }, []);

  const conicGradient = gradientStops
    .map((segment) => `${segment.color} ${segment.start}% ${segment.end}%`)
    .join(", ");

  return (
    <GlassPanel className="distribution-card">
      <div className="distribution-card__header">
        <div>
          <p className="distribution-card__eyebrow">Workload</p>
          <h3 className="distribution-card__title">חלוקת משימות</h3>
        </div>
        <span className="distribution-card__subtitle">לפי חבר צוות</span>
      </div>

      <div className="distribution-card__body">
        <div className="distribution-card__list">
          {data.map((item, index) => (
            <div key={item.name} className="distribution-card__row">
              <span
                className="distribution-card__dot"
                style={{
                  backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
                }}
              />
              <div className="distribution-card__label">{item.name}</div>
              <span className="distribution-card__value">{item.value}%</span>
            </div>
          ))}
        </div>

        <div className="distribution-card__chart">
          <div
            className="distribution-card__donut"
            style={{ background: `conic-gradient(${conicGradient})` }}
          >
            <div className="distribution-card__donut-inner">
              <span className="distribution-card__donut-icon">◌</span>
            </div>
          </div>
        </div>
      </div>
    </GlassPanel>
  );
};
