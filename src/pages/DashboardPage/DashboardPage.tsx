import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import {
  Link as LinkIcon,
  ListCheck,
  Plus,
  Save,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { Button } from "@components/ui/Button/Button";
import { GlassPanel } from "@components/ui/GlassPanel/GlassPanel";
import { PageSection } from "@components/layout/PageSection/PageSection";
import { SectionTitle } from "@components/ui/SectionTitle/SectionTitle";
import { ProgressOverviewCard } from "@components/ui/ProgressOverviewCard/ProgressOverviewCard";
import { TeamMembersCard } from "@components/ui/TeamMembersCard/TeamMembersCard";
import { TaskDistributionCard } from "@components/ui/TaskDistributionCard/TaskDistributionCard";
import { OpenTasksCard } from "@components/ui/OpenTasksCard/OpenTasksCard";
import { TeamLinksCard } from "@components/ui/TeamLinksCard/TeamLinksCard";
import { useWorkspaceProject } from "@hooks/useWorkspaceProject";
import { getProjectWorkspacePath } from "@app/router/workspaceRoutes";
import type {
  MemberDirectoryUser,
  ProjectTaskRecord,
} from "@services/firebase/firebase";
import {
  getProjectTasks,
  getUsersByIds,
  resolveMemberIdsByEmails,
  subscribeProjectTasks,
  updateProject,
  updateProjectTask,
} from "@services/firebase/firebase";
import type {
  Project,
  ProjectLink,
  ProjectMemberRole,
} from "../../types/common";
import "./DashboardPage.scss";

type DashboardTaskItem = {
  id: string;
  title: string;
  completed: boolean;
  dueDateLabel: string;
  assigneeIds: string[];
};

type DashboardMemberRow = {
  id: string;
  name: string;
  email: string;
  role: ProjectMemberRole;
  locked?: boolean;
};

type DashboardLinkRow = {
  id: string;
  label: string;
  url: string;
};

const ROLE_LABELS: Record<ProjectMemberRole, string> = {
  owner: "בעלים",
  admin: "מנהל",
  member: "חבר צוות",
};

type ProjectDeadline =
  | Project["nextMilestoneAt"]
  | Project["finalSubmissionAt"]
  | Project["dueDate"];

const formatCountdown = (timestamp?: ProjectDeadline) => {
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

const formatDateLabel = (timestamp?: Project["dueDate"]) => {
  if (!timestamp) {
    return "טרם הוגדר";
  }

  return timestamp.toDate().toLocaleDateString("he-IL", {
    day: "numeric",
    month: "short",
  });
};

const formatRelativeDeadline = (timestamp?: ProjectDeadline) => {
  if (!timestamp) {
    return "טרם הוגדר";
  }

  const differenceInDays = Math.ceil(
    (timestamp.toDate().getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );

  return differenceInDays <= 0 ? "היום" : `${differenceInDays} ימים`;
};

const getTaskDueDateLabel = (task: ProjectTaskRecord) =>
  task.dueDate?.toDate().toLocaleDateString("he-IL", {
    day: "numeric",
    month: "short",
  }) ?? "ללא מועד מוגדר";

const buildTaskItems = (tasks: ProjectTaskRecord[]): DashboardTaskItem[] =>
  [...tasks]
    .sort((left, right) => {
      const leftDue = left.dueDate?.toMillis() ?? Number.POSITIVE_INFINITY;
      const rightDue = right.dueDate?.toMillis() ?? Number.POSITIVE_INFINITY;

      if (leftDue !== rightDue) {
        return leftDue - rightDue;
      }

      return left.title.localeCompare(right.title, "he");
    })
    .map((task) => ({
      id: task.id,
      title: task.title,
      completed: task.status === "completed" || task.completed,
      dueDateLabel: getTaskDueDateLabel(task),
      assigneeIds: task.assigneeIds,
    }));

const buildProjectMembers = (
  project: Project,
  profiles: MemberDirectoryUser[],
) => {
  const profileById = new Map(
    profiles.map((profile) => [profile.uid, profile]),
  );

  return project.memberIds
    .map((memberId) => {
      const profile = profileById.get(memberId);
      const name =
        profile?.displayName ??
        profile?.email ??
        `חבר צוות ${memberId.slice(0, 4)}`;
      const email = profile?.email ?? profile?.displayName ?? memberId;

      return {
        id: memberId,
        name,
        email,
        role: project.memberRoles?.[memberId] ?? "member",
        locked: memberId === project.createdBy,
      } satisfies DashboardMemberRow;
    })
    .sort((left, right) => {
      if (left.locked && !right.locked) {
        return -1;
      }

      if (!left.locked && right.locked) {
        return 1;
      }

      return left.name.localeCompare(right.name, "he");
    });
};

const buildDistributionData = (
  members: DashboardMemberRow[],
  tasks: DashboardTaskItem[],
) => {
  const memberNames = new Map(
    members.map((member) => [member.id, member.name]),
  );

  if (tasks.length === 0) {
    return [];
  }

  const counts = new Map<string, number>();

  tasks.forEach((task) => {
    const assignees = task.assigneeIds.length > 0 ? task.assigneeIds : [];

    assignees.forEach((memberId) => {
      if (!memberId) {
        return;
      }

      counts.set(memberId, (counts.get(memberId) ?? 0) + 1);
    });
  });

  return Array.from(counts.entries())
    .map(([memberId, value]) => ({
      name: memberNames.get(memberId) ?? "ללא שיוך",
      value,
    }))
    .sort((left, right) => right.value - left.value)
    .slice(0, 4);
};

const buildMemberRoleMap = (project: Project, memberIds: string[]) => {
  const nextRoles: Record<string, ProjectMemberRole> = {
    [project.createdBy]: "owner",
  };

  memberIds.forEach((memberId) => {
    if (memberId === project.createdBy) {
      nextRoles[memberId] = "owner";
      return;
    }

    nextRoles[memberId] = project.memberRoles?.[memberId] ?? "member";
  });

  return nextRoles;
};

const buildMemberDrafts = (members: DashboardMemberRow[]) =>
  members.map((member) => ({
    id: member.id,
    name: member.name,
    email: member.email,
    role: member.role,
    locked: member.locked,
  }));

const buildLinkDrafts = (links: ProjectLink[]) =>
  links.map((link) => ({
    id: link.id,
    label: link.label,
    url: link.url,
  }));

const createEmptyLink = (): DashboardLinkRow => ({
  id: crypto.randomUUID(),
  label: "",
  url: "",
});

export const DashboardPage = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const {
    project: loadedProject,
    loading: loadingProject,
    error: loadError,
  } = useWorkspaceProject(projectId);

  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectReady, setProjectReady] = useState(false);
  const [projectMembers, setProjectMembers] = useState<MemberDirectoryUser[]>(
    [],
  );
  const [projectTasks, setProjectTasks] = useState<ProjectTaskRecord[]>([]);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [linksDialogOpen, setLinksDialogOpen] = useState(false);
  const [memberDrafts, setMemberDrafts] = useState<
    Array<{
      id: string;
      name: string;
      email: string;
      role: ProjectMemberRole;
      locked?: boolean;
    }>
  >([]);
  const [linkDrafts, setLinkDrafts] = useState<DashboardLinkRow[]>([]);
  const [membersSaving, setMembersSaving] = useState(false);
  const [linksSaving, setLinksSaving] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [linksError, setLinksError] = useState<string | null>(null);
  const membersDialogRef = useRef<HTMLDialogElement>(null);
  const linksDialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    setProjectReady(false);
  }, [projectId]);

  useEffect(() => {
    setSelectedProject(loadedProject);
    if (!loadingProject) {
      setProjectReady(true);
    }
  }, [loadedProject, loadingProject]);

  useEffect(() => {
    if (!selectedProject) {
      setProjectMembers([]);
      setProjectTasks([]);
      return;
    }

    let active = true;

    void Promise.all([
      getUsersByIds(selectedProject.memberIds),
      getProjectTasks(selectedProject.id),
    ])
      .then(([members, tasks]) => {
        if (!active) {
          return;
        }

        setProjectMembers(members);
        setProjectTasks(tasks);
      })
      .catch((error) => {
        if (!active) {
          return;
        }

        console.error("Failed to load dashboard project data", error);
        setProjectMembers([]);
        setProjectTasks([]);
      });

    return () => {
      active = false;
    };
  }, [selectedProject]);

  useEffect(() => {
    if (!selectedProject) {
      return;
    }

    const unsubscribe = subscribeProjectTasks(
      selectedProject.id,
      (nextTasks) => {
        setProjectTasks(nextTasks);
      },
      (error) => {
        console.error("Failed to subscribe to dashboard tasks", error);
      },
    );

    return () => {
      unsubscribe();
    };
  }, [selectedProject]);

  useEffect(() => {
    const dialog = membersDialogRef.current;
    if (!dialog) {
      return;
    }

    if (membersDialogOpen && !dialog.open) {
      dialog.showModal();
    }

    if (!membersDialogOpen && dialog.open) {
      dialog.close();
    }
  }, [membersDialogOpen]);

  useEffect(() => {
    const dialog = linksDialogRef.current;
    if (!dialog) {
      return;
    }

    if (linksDialogOpen && !dialog.open) {
      dialog.showModal();
    }

    if (!linksDialogOpen && dialog.open) {
      dialog.close();
    }
  }, [linksDialogOpen]);

  const activeProject = selectedProject;
  const memberRows = useMemo(
    () =>
      activeProject ? buildProjectMembers(activeProject, projectMembers) : [],
    [activeProject, projectMembers],
  );
  const taskItems = useMemo(() => buildTaskItems(projectTasks), [projectTasks]);
  const completedTaskCount = useMemo(
    () => taskItems.filter((task) => task.completed).length,
    [taskItems],
  );
  const openTasks = useMemo(
    () => taskItems.filter((task) => !task.completed),
    [taskItems],
  );
  const progressValue = taskItems.length
    ? Math.round((completedTaskCount / taskItems.length) * 100)
    : 0;
  const closestDeadline = useMemo(() => {
    if (!activeProject) {
      return null;
    }

    const deadlines = [
      activeProject.nextMilestoneAt
        ? { label: "ציון דרך קרוב", timestamp: activeProject.nextMilestoneAt }
        : null,
      activeProject.finalSubmissionAt
        ? { label: "הגשה סופית", timestamp: activeProject.finalSubmissionAt }
        : null,
      activeProject.dueDate
        ? { label: "תאריך יעד פרויקט", timestamp: activeProject.dueDate }
        : null,
    ]
      .filter(
        (
          item,
        ): item is {
          label: string;
          timestamp: NonNullable<ProjectDeadline>;
        } => Boolean(item?.timestamp),
      )
      .filter((item) => item.timestamp.toMillis() >= Date.now())
      .sort(
        (left, right) => left.timestamp.toMillis() - right.timestamp.toMillis(),
      );

    return deadlines[0] ?? null;
  }, [activeProject]);
  const distributionData = useMemo(
    () => (activeProject ? buildDistributionData(memberRows, taskItems) : []),
    [activeProject, memberRows, taskItems],
  );
  const projectLinks = activeProject?.importantLinks ?? [];
  const links = projectLinks.map((link) => ({
    label: link.label,
    href: link.url,
  }));
  const activeMembersCount = activeProject?.memberIds.length ?? 0;

  const openMembersDialog = () => {
    if (!activeProject) {
      return;
    }

    setMembersError(null);
    setMemberDrafts(buildMemberDrafts(memberRows));
    setMembersDialogOpen(true);
  };

  const openLinksDialog = () => {
    if (!activeProject) {
      return;
    }

    setLinksError(null);
    setLinkDrafts(buildLinkDrafts(projectLinks));
    setLinksDialogOpen(true);
  };

  const handleTaskToggle = async (taskId: string, nextCompleted: boolean) => {
    if (!activeProject) {
      return;
    }

    setUpdatingTaskId(taskId);

    try {
      await updateProjectTask(activeProject.id, taskId, {
        completed: nextCompleted,
        status: nextCompleted ? "completed" : "todo",
      });
    } catch (error) {
      console.error("Failed to update task", error);
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const handleMembersSave = async () => {
    if (!activeProject) {
      return;
    }

    setMembersSaving(true);
    setMembersError(null);

    const emailList = memberDrafts.map((draft) => draft.email.trim());
    const { memberIds, missingEmails } =
      await resolveMemberIdsByEmails(emailList);

    if (missingEmails.length > 0) {
      setMembersSaving(false);
      setMembersError(`לא מצאנו את המשתמשים: ${missingEmails.join(", ")}`);
      return;
    }

    const nextMemberIds = Array.from(
      new Set([activeProject.createdBy, ...memberIds]),
    );
    const nextMemberRoles = buildMemberRoleMap(activeProject, nextMemberIds);

    try {
      await updateProject(activeProject.id, {
        memberIds: nextMemberIds,
        memberRoles: nextMemberRoles,
      });

      const refreshedMembers = await getUsersByIds(nextMemberIds);
      setProjectMembers(refreshedMembers);
      setSelectedProject((current) =>
        current
          ? {
              ...current,
              memberIds: nextMemberIds,
              memberRoles: nextMemberRoles,
            }
          : current,
      );
      setMembersDialogOpen(false);
    } catch (error) {
      console.error("Failed to save project members", error);
      setMembersError("לא הצלחנו לשמור את חברי הצוות.");
    } finally {
      setMembersSaving(false);
    }
  };

  const handleLinksSave = async () => {
    if (!activeProject) {
      return;
    }

    setLinksSaving(true);
    setLinksError(null);

    const nextLinks = linkDrafts
      .map((link) => ({
        id: link.id.trim() || crypto.randomUUID(),
        label: link.label.trim(),
        url: link.url.trim(),
      }))
      .filter((link) => link.label && link.url);

    try {
      await updateProject(activeProject.id, {
        importantLinks: nextLinks,
      });

      setSelectedProject((current) =>
        current ? { ...current, importantLinks: nextLinks } : current,
      );
      setLinksDialogOpen(false);
    } catch (error) {
      console.error("Failed to save project links", error);
      setLinksError("לא הצלחנו לשמור את הקישורים.");
    } finally {
      setLinksSaving(false);
    }
  };

  if (loadingProject) {
    return (
      <PageSection className="dashboard-page">
        <div>טוען פרויקט...</div>
      </PageSection>
    );
  }

  if (!projectReady) {
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

  if (!activeProject) {
    return <Navigate to="/projects" replace />;
  }

  const progressHint =
    taskItems.length > 0
      ? `${completedTaskCount} משימות הושלמו מתוך ${taskItems.length}`
      : "אין עדיין משימות שהוגדרו לפרויקט.";
  const finalDeadline =
    activeProject.finalSubmissionAt ?? activeProject.dueDate;
  const finalDeadlineLabel = formatCountdown(finalDeadline);
  const finalDeadlineDate = formatDateLabel(finalDeadline);
  const closestDeadlineLabel = formatRelativeDeadline(
    closestDeadline?.timestamp,
  );
  const closestDeadlineDate = formatDateLabel(closestDeadline?.timestamp);

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

      <div className="dashboard-page__summary-grid">
        <div className="dashboard-page__panel dashboard-page__panel--overview">
          <ProgressOverviewCard
            progress={progressValue}
            title="התקדמות הפרויקט"
            subtitle={selectedProject.description ?? "לוח ניהול לפרויקט הנבחר."}
            hint={progressHint}
            badgeLabel={`${openTasks.length} פתוחות`}
          />
        </div>

        <div className="dashboard-page__panel dashboard-page__panel--deadline">
          <GlassPanel className="dashboard-page__deadline-card">
            <div className="dashboard-page__card-header">
              <div>
                <p className="dashboard-page__eyebrow">Deadlines</p>
                <h3 className="dashboard-page__card-title">דדליינים</h3>
              </div>
              <span className="dashboard-page__deadline-badge">
                {closestDeadlineLabel}
              </span>
            </div>

            <div className="dashboard-page__deadline-list">
              <div className="dashboard-page__deadline-item">
                <div className="dashboard-page__deadline-copy">
                  <span className="dashboard-page__deadline-label">
                    היעד הקרוב
                  </span>
                  <strong className="dashboard-page__deadline-value">
                    {closestDeadline ? closestDeadline.label : "טרם הוגדר"}
                  </strong>
                </div>
                <div className="dashboard-page__deadline-meta">
                  <span>{closestDeadlineDate}</span>
                  <span>{closestDeadlineLabel}</span>
                </div>
              </div>

              <div className="dashboard-page__deadline-item dashboard-page__deadline-item--accent">
                <div className="dashboard-page__deadline-copy">
                  <span className="dashboard-page__deadline-label">
                    הגשה סופית
                  </span>
                  <strong className="dashboard-page__deadline-value">
                    {finalDeadline ? "הגשה סופית" : "טרם הוגדר"}
                  </strong>
                </div>
                <div className="dashboard-page__deadline-meta">
                  <span>{finalDeadlineDate}</span>
                  <span>{finalDeadlineLabel}</span>
                </div>
              </div>
            </div>
          </GlassPanel>
        </div>

        <div className="dashboard-page__panel dashboard-page__panel--tasks row-span-2">
          <OpenTasksCard
            tasks={openTasks}
            onToggleTask={handleTaskToggle}
            updatingTaskId={updatingTaskId}
            emptyState="אין עדיין אבני דרך פתוחות בפרויקט."
            actions={
              <Button
                variant="secondary"
                size="sm"
                type="button"
                onClick={() =>
                  navigate(getProjectWorkspacePath(selectedProject.id, "tasks"))
                }
              >
                <ListCheck size={14} />
              </Button>
            }
          />
        </div>

        <div className="dashboard-page__panel dashboard-page__panel--links">
          <TeamLinksCard
            links={links}
            actions={
              <Button
                variant="secondary"
                size="sm"
                type="button"
                onClick={openLinksDialog}
              >
                <LinkIcon size={14} />
                <Plus size={12} />
              </Button>
            }
          />
        </div>

        <div className="dashboard-page__panel dashboard-page__panel--distribution col-span-2">
          <TaskDistributionCard data={distributionData} />
        </div>

        <div className="dashboard-page__panel dashboard-page__panel--team">
          <TeamMembersCard
            members={memberRows.map((member) => ({
              name: member.name,
              role: ROLE_LABELS[member.role],
            }))}
            actions={
              <Button
                variant="secondary"
                size="sm"
                type="button"
                onClick={openMembersDialog}
              >
                <UserPlus size={14} />
              </Button>
            }
          />
        </div>
      </div>

      <dialog
        ref={membersDialogRef}
        className="dashboard-page__dialog"
        onClose={() => setMembersDialogOpen(false)}
      >
        <form
          className="dashboard-page__dialog-form"
          onSubmit={(event) => {
            event.preventDefault();
            void handleMembersSave();
          }}
        >
          <div className="dashboard-page__dialog-header">
            <div>
              <p className="dashboard-page__eyebrow">Members</p>
              <h3 className="dashboard-page__dialog-title">עריכת חברי צוות</h3>
            </div>
            <button
              className="dashboard-page__dialog-close"
              type="button"
              onClick={() => setMembersDialogOpen(false)}
              aria-label="סגירת חלון עריכת חברים"
            >
              <X size={18} />
            </button>
          </div>

          <div className="dashboard-page__dialog-body">
            <p className="dashboard-page__dialog-hint">
              עדכנו את כתובות האימייל של חברי הצוות. יוצר הפרויקט נשמר תמיד.
            </p>

            {membersError ? (
              <p className="dashboard-page__dialog-error">{membersError}</p>
            ) : null}

            <div className="dashboard-page__dialog-list">
              {memberDrafts.map((member, index) => (
                <div key={member.id} className="dashboard-page__dialog-row">
                  <div className="dashboard-page__dialog-row-copy">
                    <span className="dashboard-page__dialog-row-name">
                      {member.name}
                    </span>
                    <span className="dashboard-page__dialog-row-role">
                      {ROLE_LABELS[member.role]}
                    </span>
                  </div>
                  <input
                    className="dashboard-page__dialog-input"
                    type="email"
                    value={member.email}
                    onChange={(event) => {
                      const nextEmail = event.target.value;
                      setMemberDrafts((current) =>
                        current.map((row, currentIndex) =>
                          currentIndex === index
                            ? { ...row, email: nextEmail }
                            : row,
                        ),
                      );
                    }}
                    placeholder="member@example.com"
                    aria-label={`אימייל עבור ${member.name}`}
                    disabled={member.locked}
                  />
                  <button
                    className="dashboard-page__dialog-remove"
                    type="button"
                    onClick={() => {
                      if (member.locked) {
                        return;
                      }

                      setMemberDrafts((current) =>
                        current.filter(
                          (_, currentIndex) => currentIndex !== index,
                        ),
                      );
                    }}
                    aria-label={`הסרת ${member.name}`}
                    disabled={member.locked}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            <button
              className="dashboard-page__dialog-add"
              type="button"
              onClick={() =>
                setMemberDrafts((current) => [
                  ...current,
                  {
                    id: crypto.randomUUID(),
                    name: "חבר צוות חדש",
                    email: "",
                    role: "member",
                  },
                ])
              }
            >
              <Plus size={16} />
              הוספת חבר צוות
            </button>
          </div>

          <div className="dashboard-page__dialog-actions">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setMembersDialogOpen(false)}
            >
              ביטול
            </Button>
            <Button type="submit" disabled={membersSaving}>
              <Save size={16} />
              שמירה
            </Button>
          </div>
        </form>
      </dialog>

      <dialog
        ref={linksDialogRef}
        className="dashboard-page__dialog"
        onClose={() => setLinksDialogOpen(false)}
      >
        <form
          className="dashboard-page__dialog-form"
          onSubmit={(event) => {
            event.preventDefault();
            void handleLinksSave();
          }}
        >
          <div className="dashboard-page__dialog-header">
            <div>
              <p className="dashboard-page__eyebrow">Links</p>
              <h3 className="dashboard-page__dialog-title">עריכת קישורים</h3>
            </div>
            <button
              className="dashboard-page__dialog-close"
              type="button"
              onClick={() => setLinksDialogOpen(false)}
              aria-label="סגירת חלון עריכת קישורים"
            >
              <X size={18} />
            </button>
          </div>

          <div className="dashboard-page__dialog-body">
            <p className="dashboard-page__dialog-hint">
              עדכנו את הקישורים של הפרויקט. כל שורה נשמרת ישירות ל-Firestore.
            </p>

            {linksError ? (
              <p className="dashboard-page__dialog-error">{linksError}</p>
            ) : null}

            <div className="dashboard-page__dialog-list">
              {linkDrafts.map((link, index) => (
                <div key={link.id} className="dashboard-page__dialog-link-row">
                  <input
                    className="dashboard-page__dialog-input"
                    type="text"
                    value={link.label}
                    onChange={(event) => {
                      const nextLabel = event.target.value;
                      setLinkDrafts((current) =>
                        current.map((row, currentIndex) =>
                          currentIndex === index
                            ? { ...row, label: nextLabel }
                            : row,
                        ),
                      );
                    }}
                    placeholder="שם הקישור"
                    aria-label={`שם הקישור ${index + 1}`}
                  />
                  <input
                    className="dashboard-page__dialog-input"
                    type="url"
                    value={link.url}
                    onChange={(event) => {
                      const nextUrl = event.target.value;
                      setLinkDrafts((current) =>
                        current.map((row, currentIndex) =>
                          currentIndex === index
                            ? { ...row, url: nextUrl }
                            : row,
                        ),
                      );
                    }}
                    placeholder="https://example.com"
                    aria-label={`כתובת הקישור ${index + 1}`}
                  />
                  <button
                    className="dashboard-page__dialog-remove"
                    type="button"
                    onClick={() =>
                      setLinkDrafts((current) =>
                        current.filter(
                          (_, currentIndex) => currentIndex !== index,
                        ),
                      )
                    }
                    aria-label={`הסרת קישור ${index + 1}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            <button
              className="dashboard-page__dialog-add"
              type="button"
              onClick={() =>
                setLinkDrafts((current) => [...current, createEmptyLink()])
              }
            >
              <Plus size={16} />
              הוספת קישור
            </button>
          </div>

          <div className="dashboard-page__dialog-actions">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setLinksDialogOpen(false)}
            >
              ביטול
            </Button>
            <Button type="submit" disabled={linksSaving}>
              <Save size={16} />
              שמירה
            </Button>
          </div>
        </form>
      </dialog>
    </PageSection>
  );
};
