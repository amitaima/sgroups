import { useEffect, useMemo, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { useAuth } from "@app/providers/AuthProvider";
import { PageSection } from "@components/layout/PageSection/PageSection";
import { SectionTitle } from "@components/ui/SectionTitle/SectionTitle";
import { ProgressOverviewCard } from "@components/ui/ProgressOverviewCard/ProgressOverviewCard";
import { DeadlineCard } from "@components/ui/DeadlineCard/DeadlineCard";
import { TeamMembersCard } from "@components/ui/TeamMembersCard/TeamMembersCard";
import { TaskDistributionCard } from "@components/ui/TaskDistributionCard/TaskDistributionCard";
import { OpenTasksCard } from "@components/ui/OpenTasksCard/OpenTasksCard";
import { TeamLinksCard } from "@components/ui/TeamLinksCard/TeamLinksCard";
import type { Project } from "../../types/common";
import { getProjectById } from "@services/firebase/firebase";
import "./DashboardPage.scss";

const formatCountdown = (timestamp?: Project["finalSubmissionAt"]) => {
  if (!timestamp) {
    return "טרם הוגדר";
  }

  const differenceInDays = Math.max(
    0,
    Math.ceil(
      (timestamp.toDate().getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    ),
  );

  return differenceInDays === 0 ? "היום" : `${differenceInDays} ימים`;
};

const formatMilestoneHint = (timestamp?: Project["nextMilestoneAt"]) => {
  if (!timestamp) {
    return "אבני הדרך מתעדכנות לפי נתוני הפרויקט.";
  }

  const dateLabel = timestamp.toDate().toLocaleDateString("he-IL", {
    day: "numeric",
    month: "short",
  });

  return `התחנה הבאה: ${dateLabel}`;
};

export const DashboardPage = () => {
  const { user } = useAuth();
  const { projectId } = useParams();
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loadingProject, setLoadingProject] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    if (!projectId || !user) {
      setSelectedProject(null);
      setLoadingProject(false);
      return () => {
        active = false;
      };
    }

    setLoadingProject(true);
    setLoadError(null);

    void getProjectById(projectId)
      .then((project) => {
        if (!active) {
          return;
        }

        if (!project || !project.memberIds.includes(user.uid)) {
          setSelectedProject(null);
          return;
        }

        setSelectedProject(project);
      })
      .catch((error) => {
        if (!active) {
          return;
        }

        console.error("Failed to load project by id", error);
        setLoadError("לא הצלחנו לטעון את הפרויקט.");
      })
      .finally(() => {
        if (active) {
          setLoadingProject(false);
        }
      });

    return () => {
      active = false;
    };
  }, [projectId, user]);

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

  if (loadingProject) {
    return (
      <PageSection className="dashboard-page">
        <div>טוען פרויקט...</div>
      </PageSection>
    );
  }

  if (loadError) {
    return (
      <PageSection className="dashboard-page">
        <div>{loadError}</div>
      </PageSection>
    );
  }

  if (!selectedProject) {
    return <Navigate to="/projects" replace />;
  }

  const activeMembersCount = selectedProject.memberIds.length;
  const progressHint = formatMilestoneHint(selectedProject.nextMilestoneAt);
  const nextMilestoneCount = formatCountdown(selectedProject.nextMilestoneAt);
  const finalSubmissionCount = formatCountdown(
    selectedProject.finalSubmissionAt,
  );

  return (
    <PageSection className="dashboard-page">
      <div className="dashboard-page__hero">
        <SectionTitle
          title={selectedProject.name}
          subtitle={selectedProject.description ?? "לוח ניהול לפרויקט הנבחר."}
          actions={
            <span className="dashboard-page__status-pill">
              <span className="dashboard-page__status-dot" />
              {activeMembersCount} חברים פעילים
            </span>
          }
        />
      </div>

      <div className="dashboard-page__top-row">
        <div className="dashboard-page__overview-panel">
          <ProgressOverviewCard
            progress={68}
            title="התקדמות הפרויקט"
            subtitle={selectedProject.description ?? "לוח ניהול לפרויקט הנבחר."}
            hint={progressHint}
            badgeLabel="מבט כללי"
          />
        </div>

        <div className="dashboard-page__deadline-stack">
          <DeadlineCard
            title="עד דדליין אבני דרך"
            value={nextMilestoneCount}
            hint="מצגת ביניים"
            tone="accent"
          />
          <DeadlineCard
            title="עד הגשה סופית"
            value={finalSubmissionCount}
            hint="הגשה מלאה"
            tone="primary"
          />
        </div>
      </div>

      <div className="dashboard-page__bento-grid">
        <div className="dashboard-page__panel dashboard-page__panel--tasks">
          <OpenTasksCard tasks={openTasks} />
        </div>
        <div className="dashboard-page__panel dashboard-page__panel--team">
          <TeamMembersCard members={members} />
        </div>
        <div className="dashboard-page__panel dashboard-page__panel--distribution">
          <TaskDistributionCard data={distribution} />
        </div>
        <div className="dashboard-page__panel dashboard-page__panel--links">
          <TeamLinksCard links={links} />
        </div>
      </div>
    </PageSection>
  );
};
