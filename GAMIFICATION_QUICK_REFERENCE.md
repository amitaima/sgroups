# Gamification System - Quick Reference

## 📦 What You Got

A complete gamified scoring system with 4 components:
1. **ScoreDisplay** - Shows user's score in navbar
2. **Podium** - Kahoot-style top 3 display
3. **LeaderboardDialog** - Full rankings table (opens from Podium)
4. **GamificationDemo** - Demo page with examples

## ⚡ Quick Start (3 Steps)

### 1️⃣ Add to Navbar
```tsx
import { ScoreDisplay } from "@components/ui/ScoreDisplay";

// In DashboardHeader component:
<ScoreDisplay userId={currentUserId} showRank={true} />
```

### 2️⃣ Add Podium to Dashboard
```tsx
import { Podium } from "@components/dashboard/Podium";

// In DashboardPage component:
<Podium />
```

### 3️⃣ Use Scoring Utilities
```tsx
import { 
  getMemberScoreById,
  getProjectMembersWithScores,
  getTopMembers,
  getScoreStatistics
} from "@utils/scoreCalculation";

// Get current user's score
const userScore = getMemberScoreById(userId);
console.log(userScore.totalScore, userScore.rank);

// Get all members sorted by score
const leaderboard = getProjectMembersWithScores();

// Get top 3
const top3 = getTopMembers(3);

// Get stats
const stats = getScoreStatistics();
```

---

## 📊 Scoring Formula

```
Score = (tasks × 10) + (subtasks × 3) + (milestones × 50) + 
        (documents × 8) + (onTime × 15) + (reviews × 12)
```

Edit weights in `src/utils/mockScoreData.ts`:
```tsx
export const scoringWeights = {
  completedTask: 10,
  completedSubtask: 3,
  milestonesReached: 50,
  documentContribution: 8,
  onTimeSubmission: 15,
  codeReview: 12,
};
```

---

## 🎨 Component Styles

All components use:
- ✅ Dark mode support
- ✅ Responsive design
- ✅ Smooth animations
- ✅ CSS variables (--space-*, --color-*, --radius-*, etc.)

Customize via global CSS variables in your design tokens.

---

## 🔄 Integration Points

### DashboardHeader
```tsx
<div className="dashboard-header__actions">
  <ScoreDisplay userId={userId} showRank={true} />
  {/* other actions */}
</div>
```

### DashboardPage
```tsx
<section className="dashboard__leaderboard">
  <Podium />
</section>
```

---

## 📁 Files Location

```
✅ src/utils/mockScoreData.ts           (Mock data)
✅ src/utils/scoreCalculation.ts        (Logic)
✅ src/components/ui/ScoreDisplay/      (Navbar component)
✅ src/components/dashboard/Podium/     (Podium component)
✅ src/components/dashboard/LeaderboardDialog/  (Table modal)
✅ src/components/dashboard/GamificationDemo/   (Demo page)
```

---

## 🧪 Test It

View the demo page (shows all components):
```tsx
import { GamificationDemo } from "@components/dashboard/GamificationDemo";

// Add to your test/demo route
<GamificationDemo userId="user1" />
```

---

## 🎯 Member Data Structure

Each member has:
- `id`, `name`, `email`, `photoURL`
- `completedTasks`
- `completedSubtasks`
- `milestonesReached`
- `documentsContributed`
- `onTimeSubmissions`
- `codeReviews`

→ Score calculated from these fields

---

## 🔗 Replace Mock Data with Firebase

When ready, update `scoreCalculation.ts`:

```tsx
// Instead of importing mockProjectMembers:
import { mockProjectMembers } from "@utils/mockScoreData";

// Use Firebase data:
async function getProjectMembers(projectId: string) {
  const members = await firestore
    .collection("projects")
    .doc(projectId)
    .collection("members")
    .getDocs();
  
  return members.docs.map(doc => doc.data() as MemberCompletionData);
}
```

---

## 🎪 Podium Details

**Layout:**
- 1️⃣ 1st place: Center, 240px height, gold border
- 2️⃣ 2nd place: Left, 200px height  
- 3️⃣ 3rd place: Right, 160px height

**Animations:**
- Bouncing medals
- Hover scale effects
- Smooth transitions

**Interactive:**
- Click to open full leaderboard dialog
- ESC key closes dialog
- Click backdrop to close

---

## 💬 Types

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

interface ProjectMemberScore extends MemberCompletionData {
  totalScore: number;
  rank?: number;
}
```

---

## 🚀 Common Tasks

**Get current user's rank:**
```tsx
const rank = getMemberRank(userId);
```

**Get top 5 members:**
```tsx
const top5 = getTopMembers(5);
```

**Get all members with scores:**
```tsx
const all = getProjectMembersWithScores();
```

**Get project statistics:**
```tsx
const stats = getScoreStatistics();
// { averageScore, maxScore, minScore, totalMembers }
```

---

## 🎁 What Each Component Does

| Component | Purpose | Interactive |
|-----------|---------|-------------|
| ScoreDisplay | Shows current user's score in navbar | Hover effect |
| Podium | Shows top 3 in staggered podium | Clickable |
| LeaderboardDialog | Full rankings table | Scrollable, filterable |
| GamificationDemo | Demo & examples | Educational |

---

## 🌙 Dark Mode

Components automatically adapt to dark mode:
- Text colors adjust
- Backgrounds darken
- Borders become lighter
- Scrollbars adapt

No configuration needed—respects system preferences.

---

## 📱 Mobile Responsive

- ✅ Tablet: Adjusts spacing and fonts
- ✅ Mobile: Stacks components, smaller avatars
- ✅ Touch-friendly: Larger touch targets

Tested on 320px+ screens.

---

## ❓ FAQ

**Q: How do I change scoring weights?**
A: Edit `src/utils/mockScoreData.ts` → `scoringWeights`

**Q: Can I customize colors?**
A: Yes, via CSS variables in your global styles

**Q: How do I add real data?**
A: Replace `mockProjectMembers` with Firebase queries

**Q: Is it mobile-friendly?**
A: Yes, fully responsive from 320px up

**Q: Can I hide the rank badge?**
A: Yes, `<ScoreDisplay userId={id} showRank={false} />`

---

## 📚 Full Documentation

See `GAMIFICATION_README.md` for complete documentation.

---

**Happy Gamifying! 🎮**
