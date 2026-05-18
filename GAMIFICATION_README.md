# Gamified Scoring System & Leaderboard Documentation

A complete gamification system for your project dashboard, featuring mock data, score calculation utilities, Kahoot-style podium display, and an interactive leaderboard.

## 📁 Project Structure

```
src/
├── components/
│   ├── dashboard/
│   │   ├── Podium/                    # Kahoot-style podium component
│   │   ├── LeaderboardDialog/         # Full leaderboard modal
│   │   └── GamificationDemo/          # Demo & integration guide
│   └── ui/
│       └── ScoreDisplay/              # User score display for navbar
└── utils/
    ├── mockScoreData.ts               # Mock member data & scoring weights
    └── scoreCalculation.ts            # Score calculation utilities
```

## 🎯 Components Overview

### 1. **ScoreDisplay** - Navbar Integration
Displays the current user's total score and rank in the navbar.

**Location:** `src/components/ui/ScoreDisplay/ScoreDisplay.tsx`

**Usage:**
```tsx
import { ScoreDisplay } from "@components/ui/ScoreDisplay";

export const DashboardHeader = ({ userId }) => {
  return (
    <header className="dashboard-header">
      {/* ...header content... */}
      <ScoreDisplay userId={userId} showRank={true} />
    </header>
  );
};
```

**Props:**
- `userId` (string): The current user's ID
- `showRank` (boolean, optional): Show rank badge (default: true)

**Styling:**
- Gold/amber gradient background with trophy icon
- Hover effects and smooth transitions
- Dark mode support
- Responsive sizing

---

### 2. **Podium** - Kahoot-Style Display
Displays the top 3 members in a Kahoot-style podium with staggered heights.
- **1st place:** Center, highest (240px)
- **2nd place:** Left, medium height (200px)
- **3rd place:** Right, shortest (160px)

**Location:** `src/components/dashboard/Podium/Podium.tsx`

**Usage:**
```tsx
import { Podium } from "@components/dashboard/Podium";

export const DashboardPage = () => {
  return (
    <div>
      <Podium />
    </div>
  );
};
```

**Features:**
- Medal emojis with bouncing animation
- Member profile pictures with rank badges
- Clickable to open full leaderboard
- Smooth hover effects
- Responsive design (adapts to mobile)
- Dark mode support

**Styling:**
- Staggered column heights create podium effect
- Gold accent borders on 1st place
- Animated bouncing medals
- Glass-morphism effect

---

### 3. **LeaderboardDialog** - Full Rankings Table
Modal dialog showing all project members ranked by score.

**Location:** `src/components/dashboard/LeaderboardDialog/LeaderboardDialog.tsx`

**Features:**
- Sortable table with rank, member profile, name, and score
- Sticky header during scrolling
- Footer statistics (total members, max score, average)
- Medal emojis for top 3
- Click backdrop to close, ESC key support
- Smooth animations
- Dark mode support
- Mobile responsive

**Opened by:** Clicking the Podium component

**Props:**
- `isOpen` (boolean): Dialog visibility state
- `onClose` (function): Callback when dialog closes

---

## 📊 Utilities

### Score Calculation Functions

**Location:** `src/utils/scoreCalculation.ts`

#### `calculateMemberScore(member: MemberCompletionData): number`
Calculates total score for a single member.

```tsx
import { calculateMemberScore } from "@utils/scoreCalculation";

const score = calculateMemberScore(member);
```

#### `getProjectMembersWithScores(): ProjectMemberScore[]`
Gets all members ranked by score (descending).

```tsx
const leaderboard = getProjectMembersWithScores();
// Returns: [{ id, name, email, photoURL, completedTasks, ..., totalScore, rank }, ...]
```

#### `getTopMembers(limit?: number): ProjectMemberScore[]`
Gets top N members (default: 3).

```tsx
const topThree = getTopMembers(3);
```

#### `getMemberScoreById(memberId: string): ProjectMemberScore | undefined`
Gets specific member's score and rank.

```tsx
const memberScore = getMemberScoreById("user1");
// Returns: { ..., totalScore: 485, rank: 2 }
```

#### `getMemberRank(memberId: string): number | undefined`
Gets only the rank number.

```tsx
const rank = getMemberRank("user1"); // Returns: 2
```

#### `getScoreStatistics(): {averageScore, maxScore, minScore, totalMembers}`
Gets project-wide score statistics.

```tsx
const stats = getScoreStatistics();
// Returns: { averageScore: 425, maxScore: 560, minScore: 280, totalMembers: 5 }
```

---

## 🎮 Scoring System

### Scoring Weights
Customize scoring by editing `src/utils/mockScoreData.ts`:

```tsx
export const scoringWeights = {
  completedTask: 10,           // Base points per task
  completedSubtask: 3,         // Points per subtask
  milestonesReached: 50,       // Bonus for milestones
  documentContribution: 8,     // Points per doc contribution
  onTimeSubmission: 15,        // Bonus for on-time work
  codeReview: 12,             // Points per code review
};
```

### Formula
```
Total Score = (completedTasks × 10) + 
              (completedSubtasks × 3) + 
              (milestonesReached × 50) + 
              (documentsContributed × 8) + 
              (onTimeSubmissions × 15) + 
              (codeReviews × 12)
```

### Mock Data Structure
Each member includes:
```tsx
interface MemberCompletionData {
  id: string;
  name: string;
  email: string;
  photoURL?: string;
  completedTasks: number;
  completedSubtasks: number;
  milestonesReached: number;
  documentsContributed: number;
  onTimeSubmissions: number;
  codeReviews: number;
}
```

---

## 🛠️ Integration Guide

### Step 1: Add ScoreDisplay to Navbar

In `src/components/layout/DashboardHeader/DashboardHeader.tsx`:

```tsx
import { ScoreDisplay } from "@components/ui/ScoreDisplay";

export const DashboardHeader = ({
  onOpenMenu,
  isMenuOpen,
  currentProjectId,
  userLabel,
  userPhoto,
  onOpenSettings,
  onSignOut,
  userId,  // Add current user ID from props
}: DashboardHeaderProps) => {
  return (
    <header className="dashboard-header">
      <div className="dashboard-header__panel">
        {/* ...existing content... */}
        
        <div className="dashboard-header__actions">
          <ScoreDisplay userId={userId} showRank={true} />
          {/* ...other actions... */}
        </div>
      </div>
    </header>
  );
};
```

### Step 2: Add Podium to Dashboard

In `src/pages/DashboardPage/DashboardPage.tsx`:

```tsx
import { Podium } from "@components/dashboard/Podium";

export const DashboardPage = () => {
  return (
    <div className="dashboard-page">
      {/* ...existing content... */}
      
      <section className="dashboard-page__leaderboard">
        <h2>لوحة المتصدرين</h2>
        <Podium />
      </section>
    </div>
  );
};
```

### Step 3: Use in Custom Components

```tsx
import { 
  getMemberScoreById,
  getProjectMembersWithScores,
  getTopMembers,
  getScoreStatistics
} from "@utils/scoreCalculation";

export const CustomLeaderboardComponent = () => {
  const topMembers = getTopMembers(5);
  const stats = getScoreStatistics();
  
  return (
    <div>
      <p>Average Team Score: {stats.averageScore}</p>
      {topMembers.map((member) => (
        <div key={member.id}>
          <span>{member.rank}. {member.name}</span>
          <span>{member.totalScore} pts</span>
        </div>
      ))}
    </div>
  );
};
```

---

## 🎨 Styling & Customization

### CSS Variables Used
- `--color-primary`, `--color-on-background`: Text colors
- `--space-*`: Spacing system
- `--radius-*`: Border radius
- `--font-size-*`: Font sizing
- `--motion-base`: Animation duration

### Dark Mode
All components support dark mode via `prefers-color-scheme: dark` media query.

### Responsive Breakpoints
- Tablet: 768px and below
- Mobile: 600px and below

All components adapt gracefully to smaller screens with adjusted heights, padding, and font sizes.

---

## 📦 Mock Data

5 sample members with realistic completion data:

1. **אלי כהן** (Eli Cohen) - 1,075 points
2. **דוד שמור** (David Shamur) - 1,035 points
3. **מוחמד אחמד** (Mohammad Ahmad) - 1,015 points
4. **דנה לוי** (Dana Levi) - 945 points
5. **שרה ישראלי** (Sarah Israeli) - 865 points

Replace mock data with real Firestore queries when implementing.

---

## 🔗 Integration with Firebase

To replace mock data with Firebase Firestore:

```tsx
// src/services/leaderboard.ts
import { collection, query, getDocs } from "firebase/firestore";
import { db } from "@services/firebase/firebase";

export async function fetchProjectMembers(projectId: string) {
  const q = query(collection(db, "projects", projectId, "members"));
  const docs = await getDocs(q);
  
  return docs.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as MemberCompletionData[];
}
```

Then update utilities to use real data instead of mock data.

---

## 🚀 Demo Component

A complete demo showing all components together:

**Location:** `src/components/dashboard/GamificationDemo/GamificationDemo.tsx`

```tsx
import { GamificationDemo } from "@components/dashboard/GamificationDemo";

export const TestPage = () => (
  <GamificationDemo userId="user1" />
);
```

This demo includes:
- Integration examples
- Implementation code snippets
- Features overview
- Best practices

---

## 🎯 Next Steps

1. ✅ Review the demo component (`GamificationDemo`)
2. ✅ Test components with different user IDs
3. ✅ Customize scoring weights in `mockScoreData.ts`
4. ✅ Integrate ScoreDisplay into DashboardHeader
5. ✅ Add Podium to main dashboard page
6. ✅ Connect to Firebase Firestore when ready
7. ✅ Adjust colors/styling to match your theme

---

## 📱 Features Checklist

- ✅ Score calculation logic with customizable weights
- ✅ User score display in navbar
- ✅ Kahoot-style podium (1st center/highest, 2nd left, 3rd right)
- ✅ Clickable podium opens full leaderboard
- ✅ Complete leaderboard table with rankings
- ✅ Member profile pictures and scores
- ✅ Responsive design for all screen sizes
- ✅ Dark mode support
- ✅ Smooth animations and transitions
- ✅ Mock data for testing
- ✅ Score statistics calculations
- ✅ Modular, reusable components

---

## 🐛 Troubleshooting

**Components not importing?**
- Ensure paths use `@components` and `@utils` aliases
- Check `tsconfig.json` for path mappings

**Styles not applying?**
- Verify SCSS variables are defined in your global styles
- Check CSS variable names match your design tokens

**Mock data not showing?**
- Components use mock data by default
- No additional setup needed for testing
- Replace with Firebase queries when ready

---

## 📄 File Reference

| File | Purpose |
|------|---------|
| `scoreCalculation.ts` | Scoring logic and calculations |
| `mockScoreData.ts` | Member data and scoring weights |
| `ScoreDisplay.tsx` | Navbar score component |
| `Podium.tsx` | Top 3 members podium display |
| `LeaderboardDialog.tsx` | Full rankings modal |
| `GamificationDemo.tsx` | Demo and integration guide |

---

**Built with React, TypeScript, and SCSS** 🎨
