/**
 * Gamification Demo Component
 * This component demonstrates how to use all gamification components together
 * Including: ScoreDisplay, Podium, and LeaderboardDialog
 */

import { ScoreDisplay } from "@components/ui/ScoreDisplay";
import { Podium } from "@components/dashboard/Podium";
import { SectionTitle } from "@components/ui/SectionTitle";
import "./GamificationDemo.scss";

interface GamificationDemoProps {
  userId?: string; // Current logged-in user ID (optional, for demo purposes)
}

export const GamificationDemo = ({ userId = "user1" }: GamificationDemoProps) => {
  return (
    <div className="gamification-demo">
      {/* Header with score display integration example */}
      <section className="gamification-demo__section">
        <SectionTitle title="Score Display Integration" />
        <div className="gamification-demo__navbar-demo">
          <p className="gamification-demo__description">
            The score display can be integrated into your project's navbar/header:
          </p>
          <div className="gamification-demo__navbar-mockup">
            <span className="gamification-demo__navbar-text">Project Name</span>
            <div className="gamification-demo__navbar-actions">
              <ScoreDisplay userId={userId} showRank={true} />
            </div>
          </div>
        </div>
      </section>

      {/* Kahoot-style podium section */}
      <section className="gamification-demo__section">
        <SectionTitle title="Kahoot-Style Leaderboard Podium" />
        <p className="gamification-demo__description">
          Click on the podium below to open the full leaderboard dialog:
        </p>
        <Podium />
      </section>

      {/* Implementation guide */}
      <section className="gamification-demo__section gamification-demo__section--guide">
        <h3 className="gamification-demo__guide-title">Implementation Guide</h3>
        <div className="gamification-demo__guide-content">
          <h4 className="gamification-demo__guide-subtitle">1. Score Display in Navbar</h4>
          <pre className="gamification-demo__code">
{`import { ScoreDisplay } from "@components/ui/ScoreDisplay";

export const DashboardHeader = ({ currentUserId }) => {
  return (
    <header>
      {/* ...header content... */}
      <ScoreDisplay userId={currentUserId} showRank={true} />
    </header>
  );
};`}
          </pre>

          <h4 className="gamification-demo__guide-subtitle">2. Podium Component</h4>
          <pre className="gamification-demo__code">
{`import { Podium } from "@components/dashboard/Podium";

export const DashboardPage = () => {
  return (
    <div>
      {/* ...other content... */}
      <Podium />
    </div>
  );
};`}
          </pre>

          <h4 className="gamification-demo__guide-subtitle">3. Score Calculation</h4>
          <pre className="gamification-demo__code">
{`import { 
  getMemberScoreById, 
  getProjectMembersWithScores,
  getTopMembers 
} from "@utils/scoreCalculation";

// Get specific member's score and rank
const memberScore = getMemberScoreById("user1");

// Get all members ranked by score
const leaderboard = getProjectMembersWithScores();

// Get top 3 members
const topMembers = getTopMembers(3);`}
          </pre>

          <h4 className="gamification-demo__guide-subtitle">4. Customizing Scoring</h4>
          <pre className="gamification-demo__code">
{`// Edit src/utils/mockScoreData.ts to adjust scoring weights:
export const scoringWeights = {
  completedTask: 10,
  completedSubtask: 3,
  milestonesReached: 50,
  documentContribution: 8,
  onTimeSubmission: 15,
  codeReview: 12,
};`}
          </pre>

          <h4 className="gamification-demo__guide-subtitle">5. Using Mock Data</h4>
          <pre className="gamification-demo__code">
{`import { mockProjectMembers } from "@utils/mockScoreData";

// Mock data includes:
// - id, name, email, photoURL
// - completedTasks, completedSubtasks
// - milestonesReached, documentsContributed
// - onTimeSubmissions, codeReviews

// Replace with real data from Firebase Firestore when ready
`}
          </pre>
        </div>
      </section>

      {/* Features list */}
      <section className="gamification-demo__section">
        <h3 className="gamification-demo__features-title">Features Overview</h3>
        <ul className="gamification-demo__features-list">
          <li className="gamification-demo__feature-item">
            <span className="gamification-demo__feature-icon">🎯</span>
            <span className="gamification-demo__feature-text">
              Flexible scoring system with customizable weights
            </span>
          </li>
          <li className="gamification-demo__feature-item">
            <span className="gamification-demo__feature-icon">🏆</span>
            <span className="gamification-demo__feature-text">
              Kahoot-style podium with staggered heights (1st center, 2nd left, 3rd right)
            </span>
          </li>
          <li className="gamification-demo__feature-item">
            <span className="gamification-demo__feature-icon">📊</span>
            <span className="gamification-demo__feature-text">
              Interactive leaderboard table with sorting and filtering
            </span>
          </li>
          <li className="gamification-demo__feature-item">
            <span className="gamification-demo__feature-icon">👤</span>
            <span className="gamification-demo__feature-text">
              User score display component with rank indicator
            </span>
          </li>
          <li className="gamification-demo__feature-item">
            <span className="gamification-demo__feature-icon">📱</span>
            <span className="gamification-demo__feature-text">
              Fully responsive design for all screen sizes
            </span>
          </li>
          <li className="gamification-demo__feature-item">
            <span className="gamification-demo__feature-icon">🎨</span>
            <span className="gamification-demo__feature-text">
              Beautiful animations and dark mode support
            </span>
          </li>
        </ul>
      </section>
    </div>
  );
};
