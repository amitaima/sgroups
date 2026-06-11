import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import type { DashboardHeaderProps } from "./DashboardHeader.types";
import { ProjectSwitcher } from "@components/layout/ProjectSwitcher/ProjectSwitcher";
import { ProfileMenuButton } from "@components/ui/ProfileMenuButton";
import { ArrowRight, Bell, Menu } from "lucide-react";
import { useWorkspaceProject } from "@hooks/useWorkspaceProject";
import { subscribeProjectTasks, getUsersByIds } from "@services/firebase/firebase";
import type { ProjectTaskRecord, MemberDirectoryUser } from "@services/firebase/firebase";
import { getProjectMemberScores } from "@utils/scoreCalculation";
import { ScoreDisplay } from "@components/ui/ScoreDisplay";
import { LeaderboardDialog } from "@components/dashboard/LeaderboardDialog";
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
  const [tasks, setTasks] = useState<ProjectTaskRecord[]>([]);
  const [members, setMembers] = useState<MemberDirectoryUser[]>([]);
  const [computedScore, setComputedScore] = useState<number | undefined>(undefined);
  const [computedRank, setComputedRank] = useState<number | undefined>(undefined);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);

  useEffect(() => {
    if (!project || !userId || !project.memberIds?.length) {
      return;
    }

    let active = true;

    void getUsersByIds(project.memberIds).then((fetchedMembers) => {
      if (active) {
        setMembers(fetchedMembers);
      }
    });

    const unsubscribe = subscribeProjectTasks(project.id, (updatedTasks) => {
      if (active) {
        setTasks(updatedTasks);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [project, userId]);

  useEffect(() => {
    if (!userId || !tasks.length || !members.length || !project) {
      return;
    }
    const rankedMembers = getProjectMemberScores(tasks, members);
    const member = rankedMembers.find((item) => item.id === userId);

    setComputedScore(member?.totalScore);
    setComputedRank(member?.rank);
  }, [tasks, members, userId, project]);

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
          <div 
            className="dashboard-header__user-score" 
            onClick={() => setIsLeaderboardOpen(true)}
            role="button"
            tabIndex={0}
            style={{ cursor: "pointer", color: "var(--color-text)" }}
          >
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
      
      {createPortal(
        <LeaderboardDialog 
          isOpen={isLeaderboardOpen} 
          onClose={() => setIsLeaderboardOpen(false)} 
          tasks={tasks.length > 0 ? tasks : undefined}
          members={members.length > 0 ? members : undefined}
        />,
        document.body,
      )}
    </header>
  );
};
