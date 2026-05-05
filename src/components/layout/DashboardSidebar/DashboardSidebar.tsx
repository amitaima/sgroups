import { GlassPanel } from "@components/ui/GlassPanel/GlassPanel";
import {
  LayoutGrid,
  CheckSquare2,
  Calendar,
  Settings,
  Sparkles,
} from "lucide-react";
import "./DashboardSidebar.scss";

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface DashboardSidebarProps {
  items: SidebarItem[];
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
          <div className="dashboard-sidebar__brand">
            <div className="dashboard-sidebar__logo">
              <Sparkles size={24} strokeWidth={2} />
            </div>
            <div className="dashboard-sidebar__brand-copy">
              <strong>SGroups</strong>
            </div>
          </div>
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
            <button
              key={item.id}
              className="dashboard-sidebar__item"
              type="button"
            >
              <span className="dashboard-sidebar__icon">{item.icon}</span>
              <span className="dashboard-sidebar__label">{item.label}</span>
            </button>
          ))}
        </nav>
      </GlassPanel>
    </aside>
  );
};
