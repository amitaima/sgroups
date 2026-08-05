import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@app/providers/AuthProvider";
import { EmptyState } from "@components/feedback/EmptyState";
import { ProjectCard } from "@components/dashboard/ProjectCard";
import { PageContainer } from "@components/layout/PageContainer/PageContainer";
import { PageSection } from "@components/layout/PageSection/PageSection";
import { Button } from "@components/ui/Button/Button";
import { GlassPanel } from "@components/ui/GlassPanel/GlassPanel";
import type { MemberAvatarItem } from "@components/users/MemberAvatarGroup";
import type { Project } from "../../types/common";
import { Plus, Sparkles, X } from "lucide-react";
import {
  createProject,
  createProjectTasks,
  getProjectTasks,
  getUserProfile,
  saveAiSummary,
  getUserProjects,
  getUsersByIds,
  resolveMemberIdsByEmails,
} from "@services/firebase/firebase";
import { calculateUserScore } from "@utils/scoreCalculation";
import {
  generateProjectTaskAutomation,
  generateUserActivitySummary,
  type UserActivitySummaryResult,
} from "@services/firebase/ai";
import "./ProjectsHomePage.scss";
import { Logo } from "@components/ui/Logo/Logo";

interface CreateProjectFormState {
  name: string;
  description: string;
  projectInstructions: string;
  finalSubmissionAt: string;
  people: string;
  trophyName: string;
  autoGenerateTasks: boolean;
}

const toActivityDate = (value: unknown): Date | null => {
  if (value && typeof value === "object" && "toDate" in value) {
    const date = (value as { toDate: () => Date }).toDate();
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
};

const toActivityDateLabel = (date: Date) =>
  new Intl.DateTimeFormat("he-IL", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
const INITIAL_FORM: CreateProjectFormState = {
  name: "",
  description: "",
  projectInstructions: "",
  finalSubmissionAt: "",
  people: "",
  trophyName: "",
  autoGenerateTasks: false,
};

export const ProjectsHomePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [projects, setProjects] = useState<Project[]>([]);
  const [membersById, setMembersById] = useState<
    Record<string, MemberAvatarItem>
  >({});
  const [projectScores, setProjectScores] = useState<Record<string, number>>(
    {},
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formState, setFormState] =
    useState<CreateProjectFormState>(INITIAL_FORM);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createWarning, setCreateWarning] = useState<string | null>(null);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [joinLink, setJoinLink] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [activitySummary, setActivitySummary] =
    useState<UserActivitySummaryResult | null>(null);
  const [activitySummaryError, setActivitySummaryError] = useState<
    string | null
  >(null);
  const [isActivitySummaryOpen, setIsActivitySummaryOpen] = useState(false);
  const [isActivitySummaryLoading, setIsActivitySummaryLoading] =
    useState(false);

  const projectStatus = {
    active: 1,
    archived: 2,
    completed: 3,
  };

  const loadProjects = useCallback(async () => {
    if (!user) {
      setProjects([]);
      setMembersById({});
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const userProjects = await getUserProjects(user.uid);
      setProjects(userProjects);

      const uniqueMemberIds = Array.from(
        new Set(userProjects.flatMap((project) => project.memberIds)),
      );

      const members = await getUsersByIds(uniqueMemberIds);
      const nextMembersById = members.reduce<Record<string, MemberAvatarItem>>(
        (acc, member) => {
          acc[member.uid] = {
            id: member.uid,
            displayName: member.displayName,
            email: member.email,
            photoURL: member.photoURL,
          };
          return acc;
        },
        {},
      );

      setMembersById(nextMembersById);

      const scores = await Promise.all(
        userProjects.map(async (project) => {
          try {
            const projectTasks = await getProjectTasks(project.id);
            return [
              project.id,
              calculateUserScore(projectTasks, user.uid),
            ] as const;
          } catch (scoreError) {
            console.error(
              `Failed to calculate score for project ${project.id}`,
              scoreError,
            );
            return [project.id, 0] as const;
          }
        }),
      );

      setProjectScores(Object.fromEntries(scores));
    } catch (loadError) {
      console.error("Failed to load projects", loadError);
      setError("לא הצלחנו לטעון את הפרויקטים כרגע. נסו שוב.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (!user || loading || projects.length === 0) {
      return;
    }

    const sessionKey = `sgroups:activity-summary:${user.uid}`;
    if (sessionStorage.getItem(sessionKey)) {
      return;
    }

    let cancelled = false;

    const loadActivitySummary = async () => {
      setIsActivitySummaryLoading(true);
      setActivitySummaryError(null);

      try {
        const profile = await getUserProfile(user.uid);
        const previousLoginAt = toActivityDate(profile?.previousLoginAt);
        const currentLoginAt =
          toActivityDate(profile?.lastLoginAt) ?? new Date();

        if (!previousLoginAt) {
          sessionStorage.setItem(sessionKey, "shown");
          return;
        }

        const projectTasksPairs = await Promise.all(
          projects.map(async (project) => {
            const tasks = await getProjectTasks(project.id);
            return { project, tasks };
          }),
        );

        const updatedProjects = projects
          .filter(
            (project) =>
              project.updatedAt.toMillis() > previousLoginAt.getTime(),
          )
          .map((project) => ({
            id: project.id,
            name: project.name,
            description: project.description,
            updatedAt: toActivityDateLabel(project.updatedAt.toDate()),
          }));

        const allRelevantTasks = projectTasksPairs.flatMap(
          ({ project, tasks }) =>
            tasks
              .filter(
                (task) => task.updatedAt.toMillis() > previousLoginAt.getTime(),
              )
              .filter(
                (task) =>
                  task.createdBy === user.uid ||
                  task.assigneeIds.includes(user.uid),
              )
              .map((task) => ({ project, task })),
        );

        const mapTask = ({
          project,
          task,
        }: (typeof allRelevantTasks)[number]) => ({
          id: task.id,
          projectName: project.name,
          title: task.title,
          status: task.status,
          priority: task.priority,
          difficulty: task.difficulty,
          dueDate: task.dueDate
            ? toActivityDateLabel(task.dueDate.toDate())
            : null,
          updatedAt: toActivityDateLabel(task.updatedAt.toDate()),
          createdByCurrentUser: task.createdBy === user.uid,
          assignedToCurrentUser: task.assigneeIds.includes(user.uid),
        });

        const createdTasks = allRelevantTasks
          .filter(
            ({ task }) =>
              task.createdBy === user.uid &&
              task.createdAt.toMillis() > previousLoginAt.getTime(),
          )
          .map(mapTask);
        const updatedTasks = allRelevantTasks.map(mapTask);

        if (
          updatedProjects.length === 0 &&
          createdTasks.length === 0 &&
          updatedTasks.length === 0
        ) {
          sessionStorage.setItem(sessionKey, "shown");
          return;
        }

        const summary = await generateUserActivitySummary({
          userName: user.displayName || user.email || "המשתמש",
          previousLoginAt: toActivityDateLabel(previousLoginAt),
          currentLoginAt: toActivityDateLabel(currentLoginAt),
          updatedProjects,
          createdTasks,
          updatedTasks,
        });

        if (cancelled) {
          return;
        }

        await saveAiSummary({
          userId: user.uid,
          projectId: null,
          source: "loginActivity",
          headline: summary.headline,
          summaryLines: summary.summaryLines,
          highlights: summary.highlights,
          nextFocus: summary.nextFocus,
          context: {
            previousLoginAt: previousLoginAt.toISOString(),
            currentLoginAt: currentLoginAt.toISOString(),
            updatedProjectCount: updatedProjects.length,
            createdTaskCount: createdTasks.length,
            updatedTaskCount: updatedTasks.length,
          },
        });

        setActivitySummary(summary);
        setIsActivitySummaryOpen(true);
        sessionStorage.setItem(sessionKey, "shown");
      } catch (summaryError) {
        console.error("Failed to generate activity summary", summaryError);
        if (!cancelled) {
          setActivitySummaryError("לא הצלחנו ליצור סיכום פעילות כרגע.");
        }
      } finally {
        if (!cancelled) {
          setIsActivitySummaryLoading(false);
        }
      }
    };

    void loadActivitySummary();

    return () => {
      cancelled = true;
    };
  }, [loading, projects, user]);
  const projectCards = useMemo(
    () =>
      projects.map((project) => ({
        project,
        members: project.memberIds.map(
          (memberId) =>
            membersById[memberId] ?? {
              id: memberId,
              displayName: memberId,
              email: null,
              photoURL: null,
            },
        ),
        score: projectScores[project.id],
      })),
    [projects, membersById, projectScores],
  );

  const getMemberLabel = (memberId: string) => {
    const member = membersById[memberId];
    return member?.displayName || member?.email || memberId;
  };

  const openCreateModal = () => {
    setCreateError(null);
    setCreateWarning(null);
    setFormState(INITIAL_FORM);
    setIsCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    if (createLoading) {
      return;
    }

    setIsCreateModalOpen(false);
    setCreateError(null);
    setCreateWarning(null);
  };

  const handleCreateProject = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!user) {
      setCreateError("צריך להתחבר כדי ליצור פרויקט.");
      return;
    }

    const projectName = formState.name.trim();
    if (!projectName) {
      setCreateError("יש להזין שם לפרויקט.");
      return;
    }

    setCreateLoading(true);
    setCreateError(null);
    setCreateWarning(null);

    try {
      const requestedEmails = formState.people
        .split(/[\n,]/)
        .map((value) => value.trim())
        .filter(Boolean);
      const warningMessages: string[] = [];

      const { memberIds, missingEmails } =
        await resolveMemberIdsByEmails(requestedEmails);

      if (missingEmails.length) {
        warningMessages.push(
          `לא מצאנו משתמשים עבור: ${missingEmails.join(", ")}. הפרויקט נוצר עם החברים שנמצאו.`,
        );
      }

      const newProjectId = await createProject({
        name: projectName,
        description: formState.description,
        projectInstructions: formState.projectInstructions,
        finalSubmissionAt: formState.finalSubmissionAt
          ? new Date(formState.finalSubmissionAt)
          : undefined,
        createdBy: user.uid,
        memberIds,
        trophyName: formState.trophyName,
      });

      const projectMemberIds = Array.from(new Set([user.uid, ...memberIds]));

      if (formState.autoGenerateTasks) {
        try {
          const generatedTasks = await generateProjectTaskAutomation({
            projectName,
            projectDescription: formState.description,
            projectInstructions: formState.projectInstructions,
            projectMemberIds,
            finalSubmissionAt: formState.finalSubmissionAt
              ? new Date(formState.finalSubmissionAt)
              : null,
          });

          await createProjectTasks(
            newProjectId,
            generatedTasks.tasks.map((task) => ({
              title: task.title,
              description: task.description,
              priority: task.priority,
              difficulty: task.difficulty,
              status: task.status,
              dueDate: task.dueDate,
              assigneeIds: task.assigneeIds,
              completed: task.completed,
              createdBy: user.uid,
            })),
          );
        } catch (taskAutomationError) {
          console.error(
            "Failed to auto-generate tasks for project",
            taskAutomationError,
          );
          warningMessages.push(
            "הפרויקט נוצר, אבל לא הצלחנו לייצר לו משימות אוטומטיות. אפשר להוסיף אותן ידנית בהמשך.",
          );
        }
      }

      setIsCreateModalOpen(false);
      setFormState(INITIAL_FORM);
      setCreateWarning(
        warningMessages.length ? warningMessages.join(" ") : null,
      );
      await loadProjects();
    } catch (createProjectError) {
      console.error("Failed to create project", createProjectError);
      setCreateError("לא הצלחנו ליצור את הפרויקט. נסו שוב.");
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <PageSection className="projects-home" dir="rtl">
      <PageContainer size="md">
        <div className="projects-home__hero">
          {/* <div className="projects-home__hero-mark" aria-hidden="true">
            <Logo size={40} color="var(--color-primary)" />
          </div> */}

          <div className="projects-home__hero-copy">
            <h1 className="projects-home__title">הפרוייקטים שלי</h1>
            <p className="projects-home__subtitle">
              בחרו סביבת עבודה פעילה כדי להמשיך למחקר ולשיתוף פעולה.
            </p>
          </div>

          <div className="projects-home__actions">
            <Button onClick={openCreateModal} size="lg">
              <Plus size={16} />
              פרויקט חדש
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => {
                setJoinLink("");
                setJoinError(null);
                setIsJoinModalOpen(true);
              }}
            >
              הצטרפות עם קישור
            </Button>
          </div>
        </div>

        {error ? <p className="projects-home__error">{error}</p> : null}
        {createWarning ? (
          <p className="projects-home__warning">{createWarning}</p>
        ) : null}

        {loading ? (
          <GlassPanel className="projects-home__loading" intensity="strong">
            טוען פרויקטים...
          </GlassPanel>
        ) : null}

        {!loading && projectCards.length === 0 ? (
          <div className="projects-home__empty-wrap">
            <EmptyState
              title="עדיין אין לכם פרויקטים"
              description="כדי להתחיל, צרו פרויקט ראשון והוסיפו חברים לפי האימייל שלהם."
              action={<Button onClick={openCreateModal}>צור פרויקט חדש</Button>}
            />
          </div>
        ) : null}

        {!loading && projectCards.length > 0 ? (
          <div className="projects-home__grid" aria-label="רשימת פרויקטים">
            {projectCards
              .sort(
                (a, b) =>
                  projectStatus[a.project.status ?? "active"] -
                  projectStatus[b.project.status ?? "active"],
              )
              .map(({ project, members, score }) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  members={members}
                  score={score}
                  creatorLabel={getMemberLabel(project.createdBy)}
                  onEnter={() => navigate(`/projects/${project.id}/dashboard`)}
                />
              ))}
          </div>
        ) : null}
      </PageContainer>

      {isActivitySummaryOpen && activitySummary ? (
        <div
          className="projects-home__modal-overlay"
          role="presentation"
          onClick={() => setIsActivitySummaryOpen(false)}
        >
          <GlassPanel
            className="projects-home__modal projects-home__activity-dialog"
            intensity="strong"
            role="dialog"
            aria-modal="true"
            aria-labelledby="activity-summary-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="projects-home__modal-header">
              <div>
                <p className="projects-home__activity-eyebrow">AI Activity</p>
                <h3
                  id="activity-summary-title"
                  className="projects-home__modal-title"
                >
                  {activitySummary.headline}
                </h3>
              </div>
              <button
                className="projects-home__close"
                type="button"
                onClick={() => setIsActivitySummaryOpen(false)}
                aria-label="סגירת סיכום פעילות"
              >
                <X size={18} />
              </button>
            </div>

            <div className="projects-home__activity-content">
              <ul className="projects-home__activity-lines">
                {activitySummary.summaryLines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>

              {activitySummary.highlights.length > 0 ? (
                <div className="projects-home__activity-highlights">
                  {activitySummary.highlights.map((highlight) => (
                    <span key={highlight}>{highlight}</span>
                  ))}
                </div>
              ) : null}

              <p className="projects-home__activity-next">
                {activitySummary.nextFocus}
              </p>
            </div>

            <div className="projects-home__form-actions">
              <Button
                type="button"
                onClick={() => setIsActivitySummaryOpen(false)}
              >
                הבנתי
              </Button>
            </div>
          </GlassPanel>
        </div>
      ) : null}

      {activitySummaryError ? (
        <p className="projects-home__activity-error">{activitySummaryError}</p>
      ) : null}

      {isActivitySummaryLoading ? null : null}

      {isCreateModalOpen ? (
        <div
          className="projects-home__modal-overlay"
          role="presentation"
          onClick={closeCreateModal}
        >
          <GlassPanel
            className="projects-home__modal"
            intensity="strong"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-project-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="projects-home__modal-header">
              <h3
                id="create-project-title"
                className="projects-home__modal-title"
              >
                פרויקט חדש
              </h3>
              <button
                className="projects-home__close"
                type="button"
                onClick={closeCreateModal}
                disabled={createLoading}
                aria-label="סגור"
              >
                &times;
              </button>
            </div>

            <form
              className="projects-home__form"
              onSubmit={handleCreateProject}
            >
              <label className="projects-home__field projects-home__field--full">
                <span>שם הפרויקט</span>
                <input
                  type="text"
                  value={formState.name}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                  placeholder="לדוגמה: מערכת מעקב מחקר"
                  required
                />
              </label>

              <label className="projects-home__field projects-home__field--full">
                <span>תיאור</span>
                <textarea
                  value={formState.description}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                  rows={2}
                  placeholder="מה המטרה של הפרויקט?"
                />
              </label>

              <label className="projects-home__field projects-home__field--full">
                <span>הנחיות הפרויקט (קישור למסמך או טקסט)</span>
                <textarea
                  value={formState.projectInstructions}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      projectInstructions: event.target.value,
                    }))
                  }
                  rows={2}
                  placeholder="הדביקו קישור למסמך ההנחיות או כתבו את ההנחיות כאן"
                />
              </label>

              <label className="projects-home__field projects-home__field--full">
                <span>תאריך יעד (אופציונלי)</span>
                <input
                  type="date"
                  value={formState.finalSubmissionAt}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      finalSubmissionAt: event.target.value,
                    }))
                  }
                />
              </label>

              <label className="projects-home__field projects-home__field--full">
                <span>אנשים (אימיילים, מופרדים בפסיק או שורה חדשה)</span>
                <textarea
                  value={formState.people}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      people: event.target.value,
                    }))
                  }
                  rows={2}
                  placeholder="student1@school.org, student2@school.org"
                />
              </label>

              <label className="projects-home__field">
                <span>פרס אלוף העבודה (אופציונלי)</span>
                <input
                  type="text"
                  value={formState.trophyName}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      trophyName: event.target.value,
                    }))
                  }
                  placeholder="לדוגמה: ארוחת צהריים עלינו"
                />
              </label>

              <label className="projects-home__toggle">
                <input
                  type="checkbox"
                  checked={formState.autoGenerateTasks}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      autoGenerateTasks: event.target.checked,
                    }))
                  }
                />
                <span className="projects-home__toggle-copy">
                  <strong>יצירת משימות אוטומטית</strong>
                  <small>
                    לאחר יצירת הפרויקט, המערכת תעריך את המורכבות ותיצור משימות
                    התחלה לפי ההנחיות.
                  </small>
                </span>
              </label>

              {createWarning ? (
                <p className="projects-home__warning">{createWarning}</p>
              ) : null}
              {createError ? (
                <p className="projects-home__error">{createError}</p>
              ) : null}

              <div className="projects-home__form-actions">
                <Button type="submit" disabled={createLoading}>
                  {createLoading ? "שומר..." : "צור פרויקט"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={closeCreateModal}
                  disabled={createLoading}
                >
                  ביטול
                </Button>
              </div>
            </form>
          </GlassPanel>
        </div>
      ) : null}

      {isJoinModalOpen ? (
        <div
          className="projects-home__modal-overlay"
          role="presentation"
          onClick={() => setIsJoinModalOpen(false)}
        >
          <GlassPanel
            className="projects-home__modal"
            intensity="strong"
            role="dialog"
            aria-modal="true"
            aria-labelledby="join-project-title"
            onClick={(event) => event.stopPropagation()}
            style={{ maxWidth: "24rem" }}
          >
            <div className="projects-home__modal-header">
              <h3
                id="join-project-title"
                className="projects-home__modal-title"
              >
                הצטרפות לפרויקט
              </h3>
              <button
                className="projects-home__close"
                type="button"
                onClick={() => setIsJoinModalOpen(false)}
                aria-label="סגור"
              >
                ×
              </button>
            </div>

            <form
              className="projects-home__form"
              onSubmit={(e) => {
                e.preventDefault();
                const match = joinLink.trim().match(/\/join\/([^/?#]+)/);
                if (!match) {
                  setJoinError("הקישור לא תקין. הדביקו קישור הצטרפות לפרויקט.");
                  return;
                }
                navigate(`/join/${match[1]}`);
              }}
            >
              <label className="projects-home__field">
                <span>קישור הצטרפות</span>
                <input
                  type="text"
                  value={joinLink}
                  onChange={(e) => {
                    setJoinLink(e.target.value);
                    setJoinError(null);
                  }}
                  placeholder="https://sgroups.netlify.app/join/..."
                  required
                  dir="ltr"
                />
              </label>

              {joinError ? (
                <p className="projects-home__error">{joinError}</p>
              ) : null}

              <div className="projects-home__form-actions">
                <Button type="submit">הצטרף</Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsJoinModalOpen(false)}
                >
                  ביטול
                </Button>
              </div>
            </form>
          </GlassPanel>
        </div>
      ) : null}
    </PageSection>
  );
};
