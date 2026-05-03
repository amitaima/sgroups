import { useMemo, useState } from "react";
import { PageContainer } from "@components/layout/PageContainer/PageContainer";
import { PageSection } from "@components/layout/PageSection/PageSection";
import { SectionTitle } from "@components/ui/SectionTitle/SectionTitle";
import { DashboardHeader } from "@components/layout/DashboardHeader/DashboardHeader";
import { DashboardSidebar } from "@components/layout/DashboardSidebar/DashboardSidebar";
import { ProgressOverviewCard } from "@components/ui/ProgressOverviewCard/ProgressOverviewCard";
import { DeadlineCard } from "@components/ui/DeadlineCard/DeadlineCard";
import { TeamMembersCard } from "@components/ui/TeamMembersCard/TeamMembersCard";
import { TaskDistributionCard } from "@components/ui/TaskDistributionCard/TaskDistributionCard";
import { OpenTasksCard } from "@components/ui/OpenTasksCard/OpenTasksCard";
import { TeamLinksCard } from "@components/ui/TeamLinksCard/TeamLinksCard";
import "./DashboardPage.scss";

const sidebarItems = ["מסך ניהול", "משימות", "יומן", "הגדרות פרוייקט"];

export const DashboardPage = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const members = useMemo(
    () => [
      { name: "נועה לוי", role: "מפתחת" },
      { name: "יותם כהן", role: "מוביל צוות" },
      { name: "שירה אברהם", role: "מחקר" },
      { name: "דניאל אברג׳ל", role: "בדיקות" },
    ],
    [],
  );

  const distribution = useMemo(
    () => [
      { name: "נועה", value: 35 },
      { name: "יותם", value: 25 },
      { name: "שירה", value: 20 },
      { name: "דניאל", value: 20 },
    ],
    [],
  );

  const openTasks = useMemo(
    () => [
      "הכנת דוח ניסויים ראשוני",
      "חיבור מודול צ׳אט לזרימת API",
      "אימות תרחישי בדיקה מול מנחה",
    ],
    [],
  );

  const links = useMemo(
    () => [
      { label: "מסמך דרישות", href: "#" },
      { label: "תיקיית מחקר", href: "#" },
      { label: "לוח השראה", href: "#" },
    ],
    [],
  );

  return (
    <div className="dashboard-shell">
      <DashboardSidebar
        items={sidebarItems}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="dashboard-shell__content">
        <DashboardHeader onOpenMenu={() => setSidebarOpen(true)} />
        <PageSection className="dashboard-page">
          <PageContainer>
            <div className="dashboard-page__hero">
              <SectionTitle
                title="לוח ניהול צוותי"
                subtitle="מרכז שליטה לפרויקט הסטודנטים והתקדמות ה-AI."
              />
            </div>

            <div className="dashboard-page__summary">
              <ProgressOverviewCard progress={68} />
              <DeadlineCard
                title="עד דדליין אבני דרך"
                value="4 ימים"
                hint="מצגת ביניים"
                tone="accent"
              />
              <DeadlineCard
                title="עד הגשה סופית"
                value="19 ימים"
                hint="הגשה מלאה"
                tone="primary"
              />
            </div>

            <div className="dashboard-page__grid">
              <TeamMembersCard members={members} />
              <TaskDistributionCard data={distribution} />
              <OpenTasksCard tasks={openTasks} />
              <TeamLinksCard links={links} />
            </div>
          </PageContainer>
        </PageSection>
      </div>
    </div>
  );
};
