import { useEffect } from "react";
import { X, Trophy, Zap } from "lucide-react";
import {
  getProjectMemberScores,
  getProjectMembersWithScores,
  type ProjectMemberScoreWithTasks,
} from "@utils/scoreCalculation";
import type { ProjectMemberScore } from "@utils/mockScoreData";
import type { MemberDirectoryUser, ProjectTaskRecord } from "@services/firebase/firebase";
import "./LeaderboardDialog.scss";

interface LeaderboardDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tasks?: ProjectTaskRecord[];
  members?: MemberDirectoryUser[];
}

/**
 * Leaderboard dialog component
 * Displays all project members ranked by score in a table
 */
export const LeaderboardDialog = ({
  isOpen,
  onClose,
  tasks,
  members,
}: LeaderboardDialogProps) => {
  const rankedMembers =
    tasks && members
      ? getProjectMemberScores(tasks, members)
      : getProjectMembersWithScores();

  // Prevent body scroll when dialog is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="leaderboard-dialog__backdrop"
        onClick={onClose}
        role="presentation"
      />

      {/* Dialog */}
      <div className="leaderboard-dialog" role="dialog" aria-modal="true">
        {/* Header */}
        <div className="leaderboard-dialog__header">
          <div className="leaderboard-dialog__title-section">
            <Trophy size={24} strokeWidth={2} />
            <h2 className="leaderboard-dialog__title">Leaderboard / לוח מובילים</h2>
          </div>
          <button
            className="leaderboard-dialog__close"
            onClick={onClose}
            aria-label="Close dialog"
            type="button"
          >
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        {/* Table */}
        <div className="leaderboard-dialog__content">
          <div className="leaderboard-dialog__table-wrapper">
            <table className="leaderboard-table">
              <thead className="leaderboard-table__head">
                <tr className="leaderboard-table__header-row">
                  <th className="leaderboard-table__cell leaderboard-table__cell--rank">
                    דירוג
                  </th>
                  <th className="leaderboard-table__cell leaderboard-table__cell--profile">
                     פרופיל
                  </th>
                  <th className="leaderboard-table__cell leaderboard-table__cell--name">
                    שם
                  </th>
                  <th className="leaderboard-table__cell leaderboard-table__cell--score">
                    ניקוד
                  </th>
                </tr>
              </thead>
              <tbody className="leaderboard-table__body">
                {rankedMembers.map((member, index) => (
                  <LeaderboardRow
                    key={member.id}
                    member={member}
                    index={index}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Stats */}
        <div className="leaderboard-dialog__footer">
          <div className="leaderboard-dialog__stat">
            <span className="leaderboard-dialog__stat-label">Participants / משתתפים</span>
            <span className="leaderboard-dialog__stat-value">{rankedMembers.length}</span>
          </div>
          <div className="leaderboard-dialog__stat">
            <span className="leaderboard-dialog__stat-label"> ניקוד גבוה</span>
            <span className="leaderboard-dialog__stat-value">
              {rankedMembers[0]?.totalScore || 0}
            </span>
          </div>
          <div className="leaderboard-dialog__stat">
            <span className="leaderboard-dialog__stat-label"> ממוצע</span>
            <span className="leaderboard-dialog__stat-value">
              {Math.round(
                rankedMembers.reduce((sum, m) => sum + m.totalScore, 0) /
                  rankedMembers.length
              )}
            </span>
          </div>
        </div>
      </div>
    </>
  );
};

interface LeaderboardRowProps {
  member: ProjectMemberScoreWithTasks | ProjectMemberScore;
  index: number;
}

const LeaderboardRow = ({ member, index }: LeaderboardRowProps) => {
  const getMedalEmoji = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return null;
  };

  const medal = getMedalEmoji(member.rank || index + 1);

  return (
    <tr className={`leaderboard-table__row ${medal ? "leaderboard-table__row--podium" : ""}`}>
      <td className="leaderboard-table__cell leaderboard-table__cell--rank">
        <span className="leaderboard-table__rank-badge">
          {medal && <span className="leaderboard-table__medal">{medal}</span>}
          <span className="leaderboard-table__rank-number">#{member.rank || index + 1}</span>
        </span>
      </td>
      <td className="leaderboard-table__cell leaderboard-table__cell--profile">
        <img
          src={
            member.photoURL || `https://i.pravatar.cc/150?img=${member.id}`
          }
          alt={member.name}
          className="leaderboard-table__avatar"
          loading="lazy"
        />
      </td>
      <td className="leaderboard-table__cell leaderboard-table__cell--name">
        <span className="leaderboard-table__name">{member.name}</span>
      </td>
      <td className="leaderboard-table__cell leaderboard-table__cell--score">
        <div className="leaderboard-table__score-badge">
          <Zap size={14} strokeWidth={2} />
          <span>{member.totalScore}</span>
        </div>
      </td>
    </tr>
  );
};
