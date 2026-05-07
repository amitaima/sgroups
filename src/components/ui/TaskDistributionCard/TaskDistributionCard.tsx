import { GlassPanel } from "@components/ui/GlassPanel/GlassPanel";
import type { TaskDistributionCardProps } from "./TaskDistributionCard.types";
import "./TaskDistributionCard.scss";

const CHART_COLORS = [
  "#00f2ff",
  "#ff7b00",
  "#62ff00",
  "#0048ff",
  "#ff00c8",
  "#00ff9e",
  "#ff0000",
  "#eaff00",
  "#00ff3c",
  "#ffb800",
];

export const TaskDistributionCard = ({ data }: TaskDistributionCardProps) => {
  // data = [
  //   {
  //     name: "Shmuel Lander",
  //     value: 12,
  //   },
  //   {
  //     name: "Amitai Malka",
  //     value: 8,
  //   },
  //   {
  //     name: "Ori Ashkenazi",
  //     value: 20,
  //   },
  //   {
  //     name: "Aviv Cohen",
  //     value: 20,
  //   },
  //   {
  //     name: "Dana Levi",
  //     value: 20,
  //   },
  // ];
  const total = data.reduce((sum, item) => sum + item.value, 0);

  const gradient =
    total > 0
      ? (() => {
          let current = 0;

          return data
            .map((item, index) => {
              const percent = (item.value / total) * 100;
              const start = current;
              const end = current + percent;
              current = end;

              return `${CHART_COLORS[index % CHART_COLORS.length]} ${start}% ${end}%`;
            })
            .join(", ");
        })()
      : "#d9e1e1 0% 100%";

  return (
    <GlassPanel className="distribution-card">
      <div className="distribution-card__header">
        <div>
          <p className="distribution-card__eyebrow">עומס עבודה</p>
          <h3 className="distribution-card__title">חלוקת משימות</h3>
        </div>
      </div>

      {data.length > 0 ? (
        <div className="distribution-card__body">
          <div className="distribution-card__chartColumn">
            <div
              className="distribution-card__donut"
              style={
                {
                  "--distribution-gradient": `conic-gradient(${gradient})`,
                } as React.CSSProperties
              }
              aria-label={`סה״כ ${total} משימות`}
            >
              <div className="distribution-card__donutCenter">
                <span className="distribution-card__total">{total}</span>
                <span className="distribution-card__totalLabel">סה״כ</span>
              </div>
            </div>
          </div>

          <div className="distribution-card__list">
            {data.map((item, index) => {
              const percent =
                total > 0 ? Math.round((item.value / total) * 100) : 0;

              return (
                <div
                  key={item.name}
                  className="distribution-card__row"
                  title={`${item.name} — ${item.value} משימות (${percent}%)`}
                >
                  <span
                    className="distribution-card__dot"
                    style={{
                      backgroundColor:
                        CHART_COLORS[index % CHART_COLORS.length],
                    }}
                  />
                  <div className="distribution-card__text">
                    <span className="distribution-card__name">{item.name}</span>
                    <span className="distribution-card__meta">
                      {percent}% מהעומס
                    </span>
                  </div>
                  <span className="distribution-card__count">{item.value}</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="distribution-card__empty">
          אין עדיין מספיק נתונים לחישוב חלוקת המשימות.
        </p>
      )}
    </GlassPanel>
  );
};
