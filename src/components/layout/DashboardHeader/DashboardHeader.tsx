import { useNavigate } from "react-router-dom";
import type { DashboardHeaderProps } from "./DashboardHeader.types";
import { ProjectSwitcher } from "@components/layout/ProjectSwitcher/ProjectSwitcher";
import { ProfileMenuButton } from "@components/ui/ProfileMenuButton";
import { ArrowRight, Bell, Moon, Sun, Menu } from "lucide-react";
import { useTheme } from "@app/providers/ThemeProvider";
import "./DashboardHeader.scss";

export const DashboardHeader = ({
  onOpenMenu,
  currentProjectId,
  userLabel,
  userPhoto,
  onSignOut,
}: DashboardHeaderProps) => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="dashboard-header">
      <div className="dashboard-header__panel">
        <div className="dashboard-header__start">
          <button
            className="dashboard-header__menu"
            type="button"
            onClick={onOpenMenu}
            aria-label="פתח תפריט"
          >
            <Menu size={18} strokeWidth={2} />
          </button>
          <button
            className="dashboard-header__back"
            type="button"
            onClick={() => navigate("/projects")}
            aria-label="חזור לכל הפרויקטים"
          >
            <ArrowRight size={18} strokeWidth={2} />
          </button>
        </div>

        <div className="dashboard-header__titles">
          <ProjectSwitcher currentProjectId={currentProjectId} />
        </div>

        <div className="dashboard-header__actions">
          <button
            className="dashboard-header__action dashboard-header__indicator"
            type="button"
            aria-label="התראות"
          >
            <Bell size={18} strokeWidth={2} />
            <span className="dashboard-header__dot" />
          </button>
          <button
            className="dashboard-header__action"
            type="button"
            onClick={toggleTheme}
            aria-label={theme === "light" ? "עבור למצב חשוך" : "עבור למצב בהיר"}
          >
            {theme === "light" ? (
              <Moon size={18} strokeWidth={2} />
            ) : (
              <Sun size={18} strokeWidth={2} />
            )}
          </button>
        </div>

        <div className="dashboard-header__meta">
          <ProfileMenuButton
            userLabel={userLabel}
            userPhoto={userPhoto}
            onSignOut={onSignOut}
          />
        </div>
      </div>
    </header>
  );
};
