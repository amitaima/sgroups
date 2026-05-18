import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { DashboardHeaderProps } from "./DashboardHeader.types";
import { ProjectSwitcher } from "@components/layout/ProjectSwitcher/ProjectSwitcher";
import { ProfileMenuButton } from "@components/ui/ProfileMenuButton";
import { ArrowRight, Bell, Menu } from "lucide-react";
import { useWorkspaceProject } from "@hooks/useWorkspaceProject";
import { getProjectTasks, getUsersByIds } from "@services/firebase/firebase";
import { getProjectMemberScores } from "@utils/scoreCalculation";
import { ScoreDisplay } from "@components/ui/ScoreDisplay";
import "./DashboardHeader.scss";

export const DashboardHeader = ({
  onOpenMenu,
  isMenuOpen = false,
  currentProjectId,
  userLabel,
  userId,
  userPhoto,
  onOpenSettings,
  onSignOut,
}: DashboardHeaderProps) => {
  const navigate = useNavigate();
  const { project } = useWorkspaceProject(currentProjectId);
  const [computedScore, setComputedScore] = useState<number | undefined>(undefined);
  const [computedRank, setComputedRank] = useState<number | undefined>(undefined);

  useEffect(() => {
    let active = true;

    const loadMemberScore = async () => {
      if (!project || !userId || !project.memberIds?.length) {
        return;
      }

      try {
        const [tasks, members] = await Promise.all([
          getProjectTasks(project.id),
          getUsersByIds(project.memberIds),
        ]);

        if (!active) {
          return;
        }

        const rankedMembers = getProjectMemberScores(tasks, members);
        const member = rankedMembers.find((item) => item.id === userId);

        setComputedScore(member?.totalScore);
        setComputedRank(member?.rank);
      } catch (error) {
        console.error("Failed to compute dashboard header score", error);
      }
    };

    void loadMemberScore();

    return () => {
      active = false;
    };
  }, [project, userId]);

  const userScore = computedScore ?? project?.memberScores?.[userId];
  const displayRank = computedRank ?? (project?.memberScores
    ? Object.entries(project.memberScores)
        .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
        .findIndex(([memberId]) => memberId === userId) + 1
    : undefined);

  return (
    <header className="dashboard-header">
      <div className="dashboard-header__panel">
        <div className="dashboard-header__start">
          <button
            className="dashboard-header__menu"
            type="button"
            onClick={onOpenMenu}
            aria-label={isMenuOpen ? "סגור תפריט" : "פתח תפריט"}
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
          <div className="dashboard-header__user-score">
            {userScore !== undefined ? (
              <ScoreDisplay
                score={userScore}
                rank={displayRank}
                showRank={true}
              />
            ) : null}
          </div>
        </div>

        <div className="dashboard-header__meta">
          <ProfileMenuButton
            userLabel={userLabel}
            userPhoto={userPhoto}
            onOpenSettings={onOpenSettings}
            onSignOut={onSignOut}
          />
        </div>
      </div>
    </header>
  );
};
