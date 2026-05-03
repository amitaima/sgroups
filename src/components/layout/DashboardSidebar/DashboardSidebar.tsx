import { GlassPanel } from "@components/ui/GlassPanel/GlassPanel";
import "./DashboardSidebar.scss";

interface DashboardSidebarProps {
  items: string[];
  isOpen: boolean;
  onClose: () => void;
}

export const DashboardSidebar = ({
  items,
  isOpen,
  onClose,
}: DashboardSidebarProps) => {
  return (
    <aside className={`dashboard-sidebar${isOpen ? " is-open" : ""}`}>
      <GlassPanel className="dashboard-sidebar__panel" intensity="strong">
        <div className="dashboard-sidebar__header">
          <span className="dashboard-sidebar__title">SGroups</span>
          <button
            className="dashboard-sidebar__close"
            type="button"
            onClick={onClose}
            aria-label="סגור תפריט"
          >
            ✕
          </button>
        </div>
        <nav className="dashboard-sidebar__nav">
          {items.map((item) => (
            <button key={item} className="dashboard-sidebar__item" type="button">
              <span className="dashboard-sidebar__icon" />
              <span className="dashboard-sidebar__label">{item}</span>
            </button>
          ))}
        </nav>
      </GlassPanel>
    </aside>
  );
};
