import type { DashboardHeaderProps } from "./DashboardHeader.types";
import { GlassPanel } from "@components/ui/GlassPanel/GlassPanel";
import "./DashboardHeader.scss";

export const DashboardHeader = ({ onOpenMenu }: DashboardHeaderProps) => {
  return (
    <header className="dashboard-header">
      <GlassPanel className="dashboard-header__panel" intensity="soft">
        <button
          className="dashboard-header__menu"
          type="button"
          onClick={onOpenMenu}
          aria-label="פתח תפריט"
        >
          ☰
        </button>
        <div className="dashboard-header__titles">
          <h1 className="dashboard-header__title">מרכז פיקוד לצוות</h1>
          <p className="dashboard-header__subtitle">
            ניהול פרויקט קבוצתי וליווי ה-AI במקום אחד.
          </p>
        </div>
        <div className="dashboard-header__hint">מיילסטון הבא בעוד 4 ימים</div>
      </GlassPanel>
    </header>
  );
};
