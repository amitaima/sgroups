import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import {
  Link as LinkIcon,
  ListCheck,
  Plus,
  Sparkles,
  Trophy,
  Save,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { useAuth } from "@app/providers/AuthProvider";
import { Button } from "@components/ui/Button/Button";
import { GlassPanel } from "@components/ui/GlassPanel/GlassPanel";
import { PageSection } from "@components/layout/PageSection/PageSection";
import { SectionTitle } from "@components/ui/SectionTitle/SectionTitle";
import { ProgressOverviewCard } from "@components/ui/ProgressOverviewCard/ProgressOverviewCard";
import { TeamMembersCard } from "@components/ui/TeamMembersCard/TeamMembersCard";
import { TaskDistributionCard } from "@components/ui/TaskDistributionCard/TaskDistributionCard";
import { OpenTasksCard } from "@components/ui/OpenTasksCard/OpenTasksCard";
import { TeamLinksCard } from "@components/ui/TeamLinksCard/TeamLinksCard";
import { TaskDialog } from "@components/ui/TaskDialog";
import type {
  TaskAssigneeOption,
  TaskDialogDraft,
} from "@components/ui/TaskDialog";
import { useWorkspaceProject } from "@hooks/useWorkspaceProject";
import { getProjectWorkspacePath } from "@app/router/workspaceRoutes";
import type {
  MemberDirectoryUser,
  ProjectTaskRecord,
} from "@services/firebase/firebase";
import {
  getProjectTasks,
  getUsersByIds,
  reassignRemovedMemberTasks,
  resolveMemberIdsByEmails,
  subscribeProjectTasks,
  updateProject,
  updateProjectTask,
} from "@services/firebase/firebase";
import type {
  Project,
  ProjectLink,
  ProjectMemberRole,
  TaskPriority,
  TaskStatus,
} from "../../types/common";
import "./DashboardPage.scss";
import { Podium } from "@components/dashboard/Podium/Podium";
import {
  getProjectMemberScores,
  getTopProjectMembers,
} from "@utils/scoreCalculation";
import {
  generateCompetitionCoachPlan,
  generateProjectProgressSummary,
  type CompetitionCoachResult,
  type ProjectProgressSummaryResult,
  type CompetitionTaskSummary,
} from "@services/firebase/ai";

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

const TASK_STATUS_ORDER: TaskStatus[] = ["todo", "inProgress", "completed"];

const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To Do",
  inProgress: "In Progress",
  completed: "Completed",
};

const ROLE_LABELS: Record<ProjectMemberRole, string> = {
  owner: "בעלים",
  faculty: "סגל",
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

const toDateInputValue = (value?: Date | null) => {
  if (!value) {
    return "";
  }

  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const parseDateInputValue = (value: string) => {
  if (!value) {
    return null;
  }

  const parsedDate = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

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

const buildEmptyTaskDraft = (): TaskDialogDraft => ({
  title: "",
  description: "",
  priority: "medium",
  difficulty: "medium",
  status: "todo",
  dueDate: "",
  assigneeIds: [],
});

const buildTaskDraftFromRecord = (
  task: ProjectTaskRecord,
): TaskDialogDraft => ({
  title: task.title,
  description: task.description ?? "",
  priority: task.priority,
  difficulty: task.difficulty,
  status: task.status,
  dueDate: toDateInputValue(task.dueDate?.toDate() ?? null),
  assigneeIds: [...task.assigneeIds],
});

const buildTaskAssigneeOption = (
  member: MemberDirectoryUser,
): TaskAssigneeOption => ({
  id: member.uid,
  displayName: member.displayName ?? null,
  email: member.email ?? null,
  photoURL: member.photoURL ?? null,
});

const buildTaskAssigneeOptions = (
  members: MemberDirectoryUser[],
): TaskAssigneeOption[] =>
  members.map(buildTaskAssigneeOption).sort((left, right) => {
    const leftLabel = left.displayName ?? left.email ?? left.id;
    const rightLabel = right.displayName ?? right.email ?? right.id;
    return leftLabel.localeCompare(rightLabel, "he");
  });

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
  const { user } = useAuth();
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
  const [copyLinkMessage, setCopyLinkMessage] = useState<string | null>(null);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [taskDialogError, setTaskDialogError] = useState<string | null>(null);
  const [taskDraft, setTaskDraft] = useState<TaskDialogDraft>(() =>
    buildEmptyTaskDraft(),
  );
  const [selectedTask, setSelectedTask] = useState<ProjectTaskRecord | null>(
    null,
  );
  const [isSavingTask, setIsSavingTask] = useState(false);
  const [showLeaderSpotlight, setShowLeaderSpotlight] = useState(false);
  const [competitionPlan, setCompetitionPlan] =
    useState<CompetitionCoachResult | null>(null);
  const [competitionPlanError, setCompetitionPlanError] = useState<
    string | null
  >(null);
  const [isGeneratingCompetitionPlan, setIsGeneratingCompetitionPlan] =
    useState(false);
  const [isCompetitionCoachOpen, setIsCompetitionCoachOpen] = useState(false);
  const [progressSummary, setProgressSummary] =
    useState<ProjectProgressSummaryResult | null>(null);
  const [progressSummaryError, setProgressSummaryError] = useState<
    string | null
  >(null);
  const [isGeneratingProgressSummary, setIsGeneratingProgressSummary] =
    useState(false);
  const [isProgressSummaryOpen, setIsProgressSummaryOpen] = useState(false);
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
  const memberById = useMemo(
    () => new Map(projectMembers.map((member) => [member.uid, member])),
    [projectMembers],
  );
  const assigneeOptions = useMemo(
    () => buildTaskAssigneeOptions(projectMembers),
    [projectMembers],
  );
  const currentTaskMembers = useMemo(() => {
    if (!selectedTask) {
      return [];
    }

    return selectedTask.assigneeIds.map((memberId) => {
      const member = memberById.get(memberId);
      if (!member) {
        return {
          id: memberId,
          displayName: null,
          email: null,
          photoURL: null,
        };
      }

      return buildTaskAssigneeOption(member);
    });
  }, [memberById, selectedTask]);
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
  const rankedMembers = useMemo(
    () => getProjectMemberScores(projectTasks, projectMembers),
    [projectMembers, projectTasks],
  );
  const topUsers = useMemo(
    () =>
      getTopProjectMembers(projectTasks, projectMembers, 3).map((m) => ({
        id: m.id,
        name: m.name,
        photoURL: m.photoURL,
        score: m.totalScore,
      })),
    [projectTasks, projectMembers],
  );
  const leader = rankedMembers[0] ?? null;
  const currentUserScore = useMemo(
    () => rankedMembers.find((member) => member.id === user?.uid) ?? null,
    [rankedMembers, user?.uid],
  );
  const scoreGap =
    leader && currentUserScore
      ? Math.max(0, leader.totalScore - currentUserScore.totalScore)
      : 0;

  useEffect(() => {
    if (!activeProject || !leader) {
      setShowLeaderSpotlight(false);
      return;
    }

    const storageKey = `sgroups:leader-spotlight:${activeProject.id}`;
    if (sessionStorage.getItem(storageKey)) {
      return;
    }

    setShowLeaderSpotlight(true);
  }, [activeProject, leader]);

  useEffect(() => {
    if (!activeProject || !leader || !showLeaderSpotlight) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      sessionStorage.setItem(
        `sgroups:leader-spotlight:${activeProject.id}`,
        "shown",
      );
      setShowLeaderSpotlight(false);
    }, 3200);

    return () => window.clearTimeout(timeoutId);
  }, [activeProject, leader, showLeaderSpotlight]);

  const closeLeaderSpotlight = () => {
    if (activeProject) {
      sessionStorage.setItem(
        `sgroups:leader-spotlight:${activeProject.id}`,
        "shown",
      );
    }
    setShowLeaderSpotlight(false);
  };

  const buildCompetitionTaskSummary = (
    task: ProjectTaskRecord,
  ): CompetitionTaskSummary => ({
    id: task.id,
    title: task.title,
    priority: task.priority,
    difficulty: task.difficulty,
    status: task.status,
    dueDate: toDateInputValue(task.dueDate?.toDate() ?? null) || null,
    assigneeNames: task.assigneeIds.map((memberId) => {
      const member = memberById.get(memberId);
      return member?.displayName ?? member?.email ?? memberId;
    }),
  });

  const handleGenerateCompetitionPlan = async () => {
    if (!leader || !currentUserScore) {
      setCompetitionPlanError("אין עדיין מספיק נתוני ניקוד כדי ליצור תוכנית.");
      return;
    }

    const rawOpenTasks = projectTasks.filter(
      (task) => task.status !== "completed" && !task.completed,
    );

    if (rawOpenTasks.length === 0) {
      setCompetitionPlanError("אין כרגע משימות פתוחות שאפשר להמליץ עליהן.");
      return;
    }

    setCompetitionPlanError(null);
    setIsGeneratingCompetitionPlan(true);

    try {
      const plan = await generateCompetitionCoachPlan({
        currentUser: {
          id: currentUserScore.id,
          name: currentUserScore.name,
          totalScore: currentUserScore.totalScore,
          rank: currentUserScore.rank,
        },
        leader: {
          id: leader.id,
          name: leader.name,
          totalScore: leader.totalScore,
          rank: leader.rank,
        },
        scoreGap,
        openTasks: rawOpenTasks.map(buildCompetitionTaskSummary),
        completedTasks: projectTasks
          .filter((task) => task.status === "completed" || task.completed)
          .map(buildCompetitionTaskSummary),
      });

      setCompetitionPlan(plan);
    } catch (error) {
      console.error("Failed to generate competition plan", error);
      setCompetitionPlanError(
        "לא הצלחנו ליצור תוכנית AI כרגע. נסי שוב עוד רגע.",
      );
    } finally {
      setIsGeneratingCompetitionPlan(false);
    }
  };
  const openCompetitionCoach = () => {
    setIsCompetitionCoachOpen(true);

    if (!competitionPlan && !isGeneratingCompetitionPlan) {
      void handleGenerateCompetitionPlan();
    }
  };

  const closeCompetitionCoach = () => {
    setIsCompetitionCoachOpen(false);
  };

  const handleGenerateProgressSummary = async () => {
    if (!activeProject) {
      setProgressSummaryError("לא נמצא פרויקט פעיל לסיכום.");
      return;
    }

    const completedTasks = projectTasks.filter(
      (task) => task.status === "completed" || task.completed,
    );
    const inProgressTasks = projectTasks.filter(
      (task) => task.status === "inProgress",
    );
    const rawOpenTasks = projectTasks.filter(
      (task) => task.status !== "completed" && !task.completed,
    );

    if (projectTasks.length === 0) {
      setProgressSummaryError("עדיין אין מספיק משימות כדי להסביר את ההתקדמות.");
      return;
    }

    setProgressSummaryError(null);
    setIsGeneratingProgressSummary(true);

    try {
      const summary = await generateProjectProgressSummary({
        project: {
          name: activeProject.name,
          description: activeProject.description,
          progress: progressValue,
        },
        completedTasks: completedTasks.map(buildCompetitionTaskSummary),
        openTasks: rawOpenTasks.map(buildCompetitionTaskSummary),
        inProgressTasks: inProgressTasks.map(buildCompetitionTaskSummary),
      });

      setProgressSummary(summary);
    } catch (error) {
      console.error("Failed to generate project progress summary", error);
      setProgressSummaryError(
        "לא הצלחנו ליצור סיכום התקדמות כרגע. נסי שוב עוד רגע.",
      );
    } finally {
      setIsGeneratingProgressSummary(false);
    }
  };

  const openProgressSummary = () => {
    setIsProgressSummaryOpen(true);

    if (!progressSummary && !isGeneratingProgressSummary) {
      void handleGenerateProgressSummary();
    }
  };

  const closeProgressSummary = () => {
    setIsProgressSummaryOpen(false);
  };

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

  const handleOpenTaskClick = (taskId: string) => {
    const task = projectTasks.find((item) => item.id === taskId);
    if (!task) {
      return;
    }

    setSelectedTask(task);
    setTaskDraft(buildTaskDraftFromRecord(task));
    setTaskDialogError(null);
    setTaskDialogOpen(true);
  };

  const closeTaskDialog = () => {
    setTaskDialogOpen(false);
    setSelectedTask(null);
    setTaskDialogError(null);
    setIsSavingTask(false);
  };

  const toggleTaskAssignee = (memberId: string) => {
    setTaskDraft((current) => {
      const hasAssignee = current.assigneeIds.includes(memberId);
      return {
        ...current,
        assigneeIds: hasAssignee
          ? current.assigneeIds.filter((item) => item !== memberId)
          : [...current.assigneeIds, memberId],
      };
    });
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

  const handleTaskDialogSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!activeProject || !selectedTask) {
      return;
    }

    const title = taskDraft.title.trim();
    if (!title) {
      setTaskDialogError("Task title is required.");
      return;
    }

    setIsSavingTask(true);
    setTaskDialogError(null);

    const dueDate = parseDateInputValue(taskDraft.dueDate);

    try {
      await updateProjectTask(activeProject.id, selectedTask.id, {
        title,
        description: taskDraft.description.trim() || null,
        priority: taskDraft.priority,
        difficulty: taskDraft.difficulty,
        status: taskDraft.status,
        dueDate,
        assigneeIds: taskDraft.assigneeIds,
        completed: taskDraft.status === "completed",
      });

      closeTaskDialog();
    } catch (error) {
      console.error("Failed to save task", error);
      setTaskDialogError("לא הצלחנו לשמור את המשימה.");
    } finally {
      setIsSavingTask(false);
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

    const profiles = await getUsersByIds(memberIds);
    const emailToUid = new Map(
      profiles
        .filter((p) => p.email)
        .map((p) => [p.email!.toLowerCase(), p.uid]),
    );

    const nextMemberIdsSet = new Set<string>([activeProject.createdBy]);
    const nextMemberRoles: Record<string, ProjectMemberRole> = {};

    // assign roles based on drafts; use resolved uid by email when possible
    memberDrafts.forEach((draft) => {
      const email = draft.email.trim().toLowerCase();
      const uid = (email && emailToUid.get(email)) || draft.id || "";
      if (!uid) return;
      nextMemberIdsSet.add(uid);
      if (uid === activeProject.createdBy) {
        nextMemberRoles[uid] = "owner";
      } else {
        nextMemberRoles[uid] = draft.role ?? "member";
      }
    });

    const nextMemberIds = Array.from(nextMemberIdsSet);

    try {
      const removedIds = activeProject.memberIds.filter(
        (id) => !nextMemberIdsSet.has(id),
      );

      await updateProject(activeProject.id, {
        memberIds: nextMemberIds,
        memberRoles: nextMemberRoles,
      });

      if (removedIds.length > 0) {
        await reassignRemovedMemberTasks(
          activeProject.id,
          removedIds,
          nextMemberIds,
        );
      }

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

      {showLeaderSpotlight && leader ? (
        <div className="dashboard-page__leader-spotlight" role="status">
          <button
            type="button"
            className="dashboard-page__leader-spotlight-close"
            onClick={closeLeaderSpotlight}
            aria-label="סגירת הצגת מוביל"
          >
            <X size={16} />
          </button>
          <div className="dashboard-page__leader-beams" aria-hidden="true" />
          <div className="dashboard-page__leader-sparkles" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div className="dashboard-page__leader-podium">
            <Trophy size={34} />
            <span>#1</span>
          </div>
          <div className="dashboard-page__leader-copy">
            <p>מוביל/ת הקבוצה כרגע</p>
            <strong>{leader.name}</strong>
            <span>{leader.totalScore} נקודות</span>
          </div>
        </div>
      ) : null}
      <div className="dashboard-page__summary-grid">
        <div className="dashboard-page__panel dashboard-page__panel--overview">
          <ProgressOverviewCard
            progress={progressValue}
            title="התקדמות הפרויקט"
            subtitle={selectedProject.description ?? "לוח ניהול לפרויקט הנבחר."}
            hint={progressHint}
            badgeLabel={`${openTasks.length} פתוחות`}
            actions={
              <Button
                className="dashboard-page__progress-ai-button"
                variant="secondary"
                size="sm"
                type="button"
                onClick={openProgressSummary}
              >
                <Sparkles size={14} />
                מה עשינו?
              </Button>
            }
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

        <div className="dashboard-page__panel dashboard-page__panel--tasks">
          <OpenTasksCard
            tasks={openTasks}
            onTaskClick={handleOpenTaskClick}
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

        <div className="dashboard-page__panel dashboard-page__panel--podium col-span-2">
          <Podium
            topUsers={topUsers}
            tasks={projectTasks}
            members={projectMembers}
            trophyName={activeProject.trophyName ?? null}
            coachButton={
              <Button
                className="dashboard-page__coach-trigger"
                variant="secondary"
                size="md"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openCompetitionCoach();
                }}
              >
                <Sparkles size={18} />
                איך לנצח עם AI?
              </Button>
            }
          />
        </div>
      </div>

      {isProgressSummaryOpen ? (
        <div
          className="dashboard-page__coach-backdrop"
          role="presentation"
          onMouseDown={closeProgressSummary}
        >
          <GlassPanel
            className="dashboard-page__coach-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="progress-summary-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="dashboard-page__coach-dialog-header">
              <div>
                <p className="dashboard-page__eyebrow">AI Summary</p>
                <h3
                  id="progress-summary-title"
                  className="dashboard-page__card-title"
                >
                  מה נעשה עד כה?
                </h3>
              </div>
              <Button
                variant="secondary"
                size="sm"
                type="button"
                onClick={closeProgressSummary}
                aria-label="סגירת סיכום AI"
              >
                <X size={16} />
              </Button>
            </div>

            {progressSummaryError ? (
              <p className="dashboard-page__coach-error">
                {progressSummaryError}
              </p>
            ) : null}

            {isGeneratingProgressSummary ? (
              <p className="dashboard-page__coach-summary">
                מסכם את התקדמות הפרויקט...
              </p>
            ) : null}

            {progressSummary ? (
              <div className="dashboard-page__coach-result dashboard-page__progress-summary-result">
                <strong>{progressSummary.headline}</strong>
                <ul>
                  {progressSummary.summaryLines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
                {progressSummary.completedHighlights.length > 0 ? (
                  <div className="dashboard-page__progress-highlights">
                    {progressSummary.completedHighlights.map((highlight) => (
                      <span key={highlight}>{highlight}</span>
                    ))}
                  </div>
                ) : null}
                <p>{progressSummary.nextFocus}</p>
                <p>{progressSummary.motivation}</p>
              </div>
            ) : null}

            <div className="dashboard-page__coach-dialog-actions">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => void handleGenerateProgressSummary()}
                disabled={isGeneratingProgressSummary}
              >
                <Sparkles size={14} />
                {progressSummary ? "רענון סיכום" : "יצירת סיכום"}
              </Button>
            </div>
          </GlassPanel>
        </div>
      ) : null}

      {isCompetitionCoachOpen ? (
        <div
          className="dashboard-page__coach-backdrop"
          role="presentation"
          onMouseDown={closeCompetitionCoach}
        >
          <GlassPanel
            className="dashboard-page__coach-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="competition-coach-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="dashboard-page__coach-dialog-header">
              <div>
                <p className="dashboard-page__eyebrow">AI Coach</p>
                <h3
                  id="competition-coach-title"
                  className="dashboard-page__card-title"
                >
                  איך לעקוף את המוביל?
                </h3>
              </div>
              <Button
                variant="secondary"
                size="sm"
                type="button"
                onClick={closeCompetitionCoach}
                aria-label="סגירת חלון AI"
              >
                <X size={16} />
              </Button>
            </div>

            <p className="dashboard-page__coach-summary">
              {leader && currentUserScore
                ? scoreGap > 0
                  ? `הפער מ-${leader.name}: ${scoreGap} נקודות.`
                  : "את כרגע במקום הראשון. ה-AI יעזור לך לשמור על ההובלה."
                : "ברגע שיהיו נתוני ניקוד, ה-AI יציע תוכנית תחרותית."}
            </p>

            {competitionPlanError ? (
              <p className="dashboard-page__coach-error">
                {competitionPlanError}
              </p>
            ) : null}

            {isGeneratingCompetitionPlan ? (
              <p className="dashboard-page__coach-summary">
                מחשב תוכנית ניצחון...
              </p>
            ) : null}

            {competitionPlan ? (
              <div className="dashboard-page__coach-result">
                <strong>{competitionPlan.headline}</strong>
                <ul>
                  {competitionPlan.strategy.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ul>
                <div className="dashboard-page__coach-task-list">
                  {competitionPlan.recommendedTasks.map((task) => (
                    <div
                      key={task.taskId ?? task.title}
                      className="dashboard-page__coach-task"
                    >
                      <span>{task.title}</span>
                      <small>{task.reason}</small>
                    </div>
                  ))}
                </div>
                <p>{competitionPlan.motivation}</p>
              </div>
            ) : null}

            <div className="dashboard-page__coach-dialog-actions">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => void handleGenerateCompetitionPlan()}
                disabled={isGeneratingCompetitionPlan}
              >
                <Sparkles size={14} />
                {competitionPlan ? "רענון עצה" : "יצירת עצה"}
              </Button>
            </div>
          </GlassPanel>
        </div>
      ) : null}

      <TaskDialog
        isOpen={taskDialogOpen}
        mode="edit"
        draft={taskDraft}
        setDraft={setTaskDraft}
        statusOptions={TASK_STATUS_ORDER}
        statusLabels={TASK_STATUS_LABELS}
        priorityLabels={TASK_PRIORITY_LABELS}
        assigneeOptions={assigneeOptions}
        currentTaskMembers={currentTaskMembers}
        onToggleAssignee={toggleTaskAssignee}
        onClose={closeTaskDialog}
        onSubmit={handleTaskDialogSubmit}
        error={taskDialogError}
        isSaving={isSavingTask}
      />

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
                  <select
                    className="dashboard-page__dialog-role-select"
                    value={member.role}
                    onChange={(event) => {
                      const nextRole = event.target.value as ProjectMemberRole;
                      setMemberDrafts((current) =>
                        current.map((row, currentIndex) =>
                          currentIndex === index
                            ? { ...row, role: nextRole }
                            : row,
                        ),
                      );
                    }}
                    aria-label={`תפקיד עבור ${member.name}`}
                    disabled={member.locked}
                  >
                    <option value="owner">{ROLE_LABELS.owner}</option>
                    <option value="faculty">{ROLE_LABELS.faculty}</option>
                    <option value="member">{ROLE_LABELS.member}</option>
                  </select>

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
              onClick={async () => {
                if (!activeProject) return;
                try {
                  const joinLink = `${window.location.origin}/join/${activeProject.id}`;
                  await navigator.clipboard.writeText(joinLink);
                  setCopyLinkMessage("קישור ההצטרפות הועתק ללוח.");
                  window.setTimeout(() => setCopyLinkMessage(null), 2500);
                } catch (err) {
                  setCopyLinkMessage("לא הצלחנו להעתיק את הקישור.");
                  window.setTimeout(() => setCopyLinkMessage(null), 2500);
                }
              }}
            >
              העתק קישור הצטרפות
            </Button>

            <div className="flex gap-4">
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
          </div>
          {copyLinkMessage ? (
            <p className="dashboard-page__dialog-copy-msg">{copyLinkMessage}</p>
          ) : null}
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
            <div></div>
            <div className="flex gap-4">
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
          </div>
        </form>
      </dialog>
    </PageSection>
  );
};
