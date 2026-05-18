import { Trophy } from "lucide-react";
import {
  getMemberScoreById,
  getMemberRank,
} from "@utils/scoreCalculation";
import "./ScoreDisplay.scss";

interface ScoreDisplayProps {
  userId?: string;
  score?: number;
  rank?: number;
  showRank?: boolean;
}

/**
 * Score display component for navbar or page-level score badges.
 * It can render a passed score/rank or fall back to the legacy user score lookup.
 */
export const ScoreDisplay = ({
  userId,
  score,
  rank,
  showRank = true,
}: ScoreDisplayProps) => {
  const memberScore = score !== undefined ? { totalScore: score } : userId ? getMemberScoreById(userId) : undefined;
  const displayRank = rank !== undefined ? rank : showRank && userId ? getMemberRank(userId) : undefined;

  if (!memberScore) {
    return null;
  }

  return (
    <div className="score-display">
      <Trophy size={16} strokeWidth={2} />
      <span className="score-display__score">{memberScore.totalScore}</span>
    </div>
  );
};
