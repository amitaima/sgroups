import { GlassPanel } from "@components/ui/GlassPanel/GlassPanel";
import { Logo } from "@components/ui/Logo";
import { getProjectWorkspacePath } from "@app/router/workspaceRoutes";
import { X } from "lucide-react";
import { NavLink } from "react-router-dom";
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
  currentProjectId?: string | null;
}

export const DashboardSidebar = ({
  items,
  isOpen,
  onClose,
  currentProjectId,
}: DashboardSidebarProps) => {
  return (
    <aside className={`dashboard-sidebar${isOpen ? " is-open" : ""}`}>
      <GlassPanel className="dashboard-sidebar__panel" intensity="strong">
        <div className="dashboard-sidebar__header">
          <div className="dashboard-sidebar__brand">
            <div className="dashboard-sidebar__logo">
              <Logo size={28} color="var(--color-surface)" />
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
            <X size={18} strokeWidth={2} />
          </button>
        </div>
        <nav className="dashboard-sidebar__nav">
          {items.map((item) => {
            const to = currentProjectId
              ? getProjectWorkspacePath(currentProjectId, item.id as any)
              : "/projects";

            return (
              <NavLink
                key={item.id}
                to={to}
                className={({ isActive }) =>
                  ["dashboard-sidebar__item", isActive ? "is-active" : ""]
                    .filter(Boolean)
                    .join(" ")
                }
                onClick={onClose}
              >
                <span className="dashboard-sidebar__icon">{item.icon}</span>
                <span className="dashboard-sidebar__label">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </GlassPanel>
    </aside>
  );
};
