import { Chart } from "react-google-charts";
import { GlassPanel } from "@components/ui/GlassPanel/GlassPanel";
import type { TaskDistributionCardProps } from "./TaskDistributionCard.types";
import "./TaskDistributionCard.scss";

const CHART_COLORS = ["#356669", "#8f4e10", "#576151", "#c0c8c8"];

export const TaskDistributionCard = ({ data }: TaskDistributionCardProps) => {
  const chartData = [
    ["חבר צוות", "משימות"],
    ...data.map((item) => [item.name, item.value]),
  ];
  const chartOptions = {
    backgroundColor: "transparent",
    pieHole: 0.68,
    pieSliceText: "none",
    legend: { position: "none" },
    chartArea: {
      left: 0,
      top: 0,
      width: "100%",
      height: "100%",
    },
    colors: CHART_COLORS,
    tooltip: { text: "value" },
    fontName: "inherit",
    slices: data.reduce<Record<number, { color: string }>>(
      (accumulator, _item, index) => {
        accumulator[index] = {
          color: CHART_COLORS[index % CHART_COLORS.length],
        };
        return accumulator;
      },
      {},
    ),
  };

  return (
    <GlassPanel className="distribution-card">
      <div className="distribution-card__header">
        <div>
          <p className="distribution-card__eyebrow">Workload</p>
          <h3 className="distribution-card__title">חלוקת משימות</h3>
        </div>
        <span className="distribution-card__subtitle">לפי חבר צוות</span>
      </div>

      {data.length > 0 ? (
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
                <span className="distribution-card__value">{item.value}</span>
              </div>
            ))}
          </div>

          <div className="distribution-card__chart">
            <Chart
              chartType="PieChart"
              width="100%"
              height="180px"
              data={chartData}
              options={chartOptions}
            />
          </div>
        </div>
      ) : (
        <p className="distribution-card__empty">
          אין עדיין מספיק נתונים לחישוב חלוקת משימות.
        </p>
      )}
    </GlassPanel>
  );
};
