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
import { Plus, Sparkles } from "lucide-react";
import {
  createProject,
  getProjectTasks,
  getUserProjects,
  getUsersByIds,
  resolveMemberIdsByEmails,
} from "@services/firebase/firebase";
import { calculateProjectScore } from "@utils/scoreCalculation";
import "./ProjectsHomePage.scss";
import { Logo } from "@components/ui/Logo/Logo";

interface CreateProjectFormState {
  name: string;
  description: string;
  finalSubmissionAt: string;
  people: string;
  trophyName: string;
}

const INITIAL_FORM: CreateProjectFormState = {
  name: "",
  description: "",
  finalSubmissionAt: "",
  people: "",
  trophyName: "",
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
            return [project.id, calculateProjectScore(projectTasks)] as const;
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

      const { memberIds, missingEmails } =
        await resolveMemberIdsByEmails(requestedEmails);

      if (missingEmails.length) {
        setCreateWarning(
          `לא מצאנו משתמשים עבור: ${missingEmails.join(", ")}. הפרויקט נוצר עם החברים שנמצאו.`,
        );
      }

      await createProject({
        name: projectName,
        description: formState.description,
        finalSubmissionAt: formState.finalSubmissionAt
          ? new Date(formState.finalSubmissionAt)
          : undefined,
        createdBy: user.uid,
        memberIds,
        trophyName: formState.trophyName,
      });

      setIsCreateModalOpen(false);
      setFormState(INITIAL_FORM);
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
          <div className="projects-home__hero-mark" aria-hidden="true">
            <Logo size={40} color="var(--color-primary)" />
          </div>

          <div className="projects-home__hero-copy">
            <p className="projects-home__eyebrow">הפרויקטים שלי</p>
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
            <Button variant="secondary" size="lg" onClick={openCreateModal}>
              הזמנה באמצעות אימייל
            </Button>
          </div>
        </div>

        {error ? <p className="projects-home__error">{error}</p> : null}

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
                ×
              </button>
            </div>

            <form
              className="projects-home__form"
              onSubmit={handleCreateProject}
            >
              <label className="projects-home__field">
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

              <label className="projects-home__field">
                <span>תיאור</span>
                <textarea
                  value={formState.description}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                  rows={3}
                  placeholder="מה המטרה של הפרויקט?"
                />
              </label>

              <label className="projects-home__field">
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

              <label className="projects-home__field">
                <span>אנשים (אימיילים, מופרדים בפסיק או שורה חדשה)</span>
                <textarea
                  value={formState.people}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      people: event.target.value,
                    }))
                  }
                  rows={3}
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
    </PageSection>
  );
};
