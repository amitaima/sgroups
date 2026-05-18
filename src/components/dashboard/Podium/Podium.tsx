import { useState } from "react";
import {
  getProjectMemberScores,
  getTopMembers,
  getTopProjectMembers,
  type ProjectMemberScoreWithTasks,
} from "@utils/scoreCalculation";
import type { ProjectMemberScore } from "@utils/mockScoreData";
import { LeaderboardDialog } from "@components/dashboard/LeaderboardDialog";
import type { MemberDirectoryUser, ProjectTaskRecord } from "@services/firebase/firebase";
import "./Podium.scss";

interface PodiumProps {
  tasks?: ProjectTaskRecord[];
  members?: MemberDirectoryUser[];
}

/**
 * Kahoot-style podium component
 * Displays top 3 members with ranking (1st place center/highest, 2nd place left, 3rd place right)
 */
export const Podium = ({ tasks, members }: PodiumProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const hasProjectData = Array.isArray(tasks) && tasks.length > 0 && Array.isArray(members) && members.length > 0;
  const topMembers = hasProjectData
    ? getTopProjectMembers(tasks, members, 3)
    : getTopMembers(3);

  // Arrange members in podium order: [2nd, 1st, 3rd]
  const podiumOrder: (ProjectMemberScoreWithTasks | ProjectMemberScore | undefined)[] = [
    topMembers[1], // 2nd place on left
    topMembers[0], // 1st place in center (highest)
    topMembers[2], // 3rd place on right
  ];

  const handlePodiumClick = () => {
    setIsDialogOpen(true);
  };

  return (
    <>
      <div className="podium" onClick={handlePodiumClick} role="button" tabIndex={0}>
        <div className="podium__container">
          <div className="podium__step podium__step--second">
            {podiumOrder[0] && (
              <PodiumMember member={podiumOrder[0]} position="second" />
            )}
          </div>

          <div className="podium__step podium__step--first">
            {podiumOrder[1] && (
              <PodiumMember member={podiumOrder[1]} position="first" />
            )}
          </div>

          <div className="podium__step podium__step--third">
            {podiumOrder[2] && (
              <PodiumMember member={podiumOrder[2]} position="third" />
            )}
          </div>
        </div>
      </div>

      <LeaderboardDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        tasks={tasks}
        members={members}
      />
    </>
  );
};

interface PodiumMemberProps {
  member: ProjectMemberScore;
  position: "first" | "second" | "third";
}

const PodiumMember = ({ member, position }: PodiumMemberProps) => {
  const positionLabel = {
    first: "🥇",
    second: "🥈",
    third: "🥉",
  };

  const rankNumber = position === "first" ? 1 : position === "second" ? 2 : 3;

  return (
    <div className={`podium-member podium-member--${position}`}>
      <div className="podium-member__medal">{positionLabel[position]}</div>

      <div className="podium-member__content">
        <div className="podium-member__avatar">
          <img
            src={member.photoURL || `https://i.pravatar.cc/150?img=${member.id}`}
            alt={member.name}
            loading="lazy"
          />
          <span className="podium-member__rank">#{rankNumber}</span>
        </div>

        <div className="podium-member__info">
          <h3 className="podium-member__name">{member.name}</h3>
          <p className="podium-member__score">{member.totalScore} pts</p>
        </div>
      </div>
    </div>
  );
};
