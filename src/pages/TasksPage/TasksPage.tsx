import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useParams, useSearchParams } from "react-router-dom";
import { Copy, Filter, Plus, Sparkles, SlidersHorizontal, TriangleAlert, X } from "lucide-react";
import { useAuth } from "@app/providers/AuthProvider";
import { Button } from "@components/ui/Button/Button";
import { GlassPanel } from "@components/ui/GlassPanel/GlassPanel";
import { PageSection } from "@components/layout/PageSection/PageSection";
import { SectionTitle } from "@components/ui/SectionTitle/SectionTitle";
import { TaskCard } from "@components/dashboard/TaskCard";
import { TaskDialog } from "@components/ui/TaskDialog";
import { useWorkspaceProject } from "@hooks/useWorkspaceProject";
import type {
  MemberDirectoryUser,
  ProjectTaskRecord,
} from "@services/firebase/firebase";
import {
  createProjectTask,
  deleteProjectTask,
  getUserProfile,
  saveAiSummary,
  getUsersByIds,
  subscribeProjectTasks,
  updateProjectTask,
} from "@services/firebase/firebase";
import {
  generateTaskSuggestion,
  generateUserActivitySummary,
  type UserActivitySummaryResult,
} from "@services/firebase/ai";
import type { TaskCardData } from "@components/dashboard/TaskCard";
import type { TaskPriority, TaskStatus } from "../../types/common";
import type {
  TaskAssigneeOption,
  TaskBoardColumnData,
  TaskDialogDraft,
} from "./TasksPage.types";
import "./TasksPage.scss";

const TASK_COLUMN_CONFIG: Record<
  TaskStatus,
  { title: string; tone: TaskBoardColumnData["tone"] }
> = {
  todo: { title: "To Do", tone: "neutral" },
  inProgress: { title: "In Progress", tone: "teal" },
  review: { title: "Review", tone: "olive" },
  completed: { title: "Completed", tone: "primary" },
};

const TASK_STATUS_ORDER: TaskStatus[] = [
  "todo",
  "inProgress",
  "review",
  "completed",
];

const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To Do",
  inProgress: "In Progress",
  review: "Review",
  completed: "Completed",
};


type TaskStatusMenuState = {
  taskId: string;
  x: number;
  y: number;
};

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
const createNoRecentActivitySummary = (): UserActivitySummaryResult => ({
  headline: "לא היו שינויים לאחרונה",
  summaryLines: ["לא היו שינויים לאחרונה"],
  highlights: [],
  nextFocus: "ללא פעילות אחרונה",
});


const getShortTaskDescription = (description?: string | null) => {
  const normalizedDescription = description?.trim();

  if (!normalizedDescription) {
    return null;
  }

  const [firstLine] = normalizedDescription.split(/\r?\n/);
  return firstLine.length > 90 ? `${firstLine.slice(0, 90).trim()}...` : firstLine;
};
const createFallbackActivitySummary = (
  tasks: Array<{ title: string; description?: string | null; status: string; updatedAt: string }>,
): UserActivitySummaryResult => {
  const lines = tasks.slice(0, 3).map((task) => {
    const description = getShortTaskDescription(task.description) ?? "ללא פירוט נוסף";
    return `${task.title} - פירוט קצר: ${description}.`;
  });

  return {
    headline: "סיכום פעילות אחרונה",
    summaryLines: lines,
    highlights: tasks.slice(0, 3).map((task) => task.title),
    nextFocus: "אפשר לשלוח את העדכון הזה לצוות ולהמשיך לקדם את המשימות הפתוחות.",
  };
};

const TASK_PRIORITIES: TaskPriority[] = ["high", "medium", "low"];

const parseFilterQueryParam = (value: string | null) =>
  value
    ? value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

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

const formatDueDateLabel = (task: ProjectTaskRecord) => {
  if (!task.dueDate) {
    return "ללא מועד מוגדר";
  }

  return task.dueDate.toDate().toLocaleDateString("he-IL", {
    day: "numeric",
    month: "short",
  });
};

const buildEmptyTaskDraft = (assigneeId = ""): TaskDialogDraft => ({
  title: "",
  description: "",
  priority: "medium",
  difficulty: "medium",
  status: "todo",
  dueDate: "",
  assigneeIds: assigneeId ? [assigneeId] : [],
});

const buildTaskDraftFromRecord = (
  task: ProjectTaskRecord,
): TaskDialogDraft => ({
  title: task.title,
  description: task.description ?? "",
  priority: task.priority,
  difficulty: task.difficulty ?? "medium",
  status: task.status,
  dueDate: toDateInputValue(task.dueDate?.toDate() ?? null),
  assigneeIds: [...task.assigneeIds],
});

const buildTaskAssigneeOptions = (
  members: MemberDirectoryUser[],
): TaskAssigneeOption[] =>
  members
    .map((member) => ({
      id: member.uid,
      displayName: member.displayName ?? null,
      email: member.email ?? null,
      photoURL: member.photoURL ?? null,
    }))
    .sort((left, right) => {
      const leftLabel = left.displayName ?? left.email ?? left.id;
      const rightLabel = right.displayName ?? right.email ?? right.id;
      return leftLabel.localeCompare(rightLabel, "he");
    });

const buildTaskAssigneeOption = (
  member: MemberDirectoryUser,
): TaskAssigneeOption => ({
  id: member.uid,
  displayName: member.displayName ?? null,
  email: member.email ?? null,
  photoURL: member.photoURL ?? null,
});

const buildTaskCardData = (
  task: ProjectTaskRecord,
  memberById: Map<string, MemberDirectoryUser>,
): TaskCardData => ({
  id: task.id,
  title: task.title,
  description: task.description ?? undefined,
  priority: task.priority,
  difficulty: task.difficulty ?? "medium",
  status: task.status,
  dueDateLabel: formatDueDateLabel(task),
  assignees: task.assigneeIds.map((memberId) => {
    const member = memberById.get(memberId);

    return {
      id: memberId,
      displayName: member?.displayName ?? null,
      email: member?.email ?? null,
      photoURL: member?.photoURL ?? null,
    };
  }),
  overdue:
    Boolean(task.dueDate) &&
    task.status !== "completed" &&
    task.dueDate!.toMillis() < Date.now(),
  completed: task.status === "completed" || task.completed,
});

const buildTaskBoardColumns = (
  tasks: ProjectTaskRecord[],
  memberById: Map<string, MemberDirectoryUser>,
): TaskBoardColumnData[] => {
  const tasksByStatus = new Map<TaskStatus, ProjectTaskRecord[]>(
    TASK_STATUS_ORDER.map((status) => [status, []]),
  );

  tasks.forEach((task) => {
    tasksByStatus.get(task.status)?.push(task);
  });

  return TASK_STATUS_ORDER.map((status) => {
    const statusTasks = [...(tasksByStatus.get(status) ?? [])].sort(
      (left, right) => {
        const leftDue = left.dueDate?.toMillis() ?? Number.POSITIVE_INFINITY;
        const rightDue = right.dueDate?.toMillis() ?? Number.POSITIVE_INFINITY;

        if (leftDue !== rightDue) {
          return leftDue - rightDue;
        }

        return left.title.localeCompare(right.title, "he");
      },
    );

    return {
      id: status,
      title: TASK_COLUMN_CONFIG[status].title,
      tone: TASK_COLUMN_CONFIG[status].tone,
      count: statusTasks.length,
      tasks: statusTasks.map((task) => buildTaskCardData(task, memberById)),
    };
  });
};

const getDefaultAssigneeId = (
  projectCreatedBy?: string,
  currentUserId?: string | null,
) => projectCreatedBy ?? currentUserId ?? "";

export const TasksPage = () => {
  const { user } = useAuth();
  const { projectId } = useParams();
  const { project, loading, error } = useWorkspaceProject(projectId);

  const [boardView, setBoardView] = useState<"board" | "list">("board");
  const [tasks, setTasks] = useState<ProjectTaskRecord[]>([]);
  const [projectMembers, setProjectMembers] = useState<MemberDirectoryUser[]>(
    [],
  );
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<TaskStatus | null>(
    null,
  );
  const [taskDialogMode, setTaskDialogMode] = useState<
    "create" | "edit" | null
  >(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [taskDraft, setTaskDraft] = useState<TaskDialogDraft>(() =>
    buildEmptyTaskDraft(),
  );
  const [taskDialogError, setTaskDialogError] = useState<string | null>(null);
  const [isSavingTask, setIsSavingTask] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [movingTaskId, setMovingTaskId] = useState<string | null>(null);
  const [statusMenu, setStatusMenu] = useState<TaskStatusMenuState | null>(null);
  const [taskPendingDelete, setTaskPendingDelete] = useState<ProjectTaskRecord | null>(null);
  const [isGeneratingTaskSuggestion, setIsGeneratingTaskSuggestion] = useState(false);
  const [isTaskSuggestionUsed, setIsTaskSuggestionUsed] = useState(false);
  const [taskSuggestionTitleError, setTaskSuggestionTitleError] = useState<
    string | null
  >(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activitySummary, setActivitySummary] = useState<UserActivitySummaryResult | null>(null);
  const [activitySummaryError, setActivitySummaryError] = useState<string | null>(null);
  const [isActivitySummaryOpen, setIsActivitySummaryOpen] = useState(false);
  const [isGeneratingActivitySummary, setIsGeneratingActivitySummary] = useState(false);
  const [activitySummaryCopyMessage, setActivitySummaryCopyMessage] = useState<string | null>(null);
  const activitySummaryUserName = user?.displayName || user?.email || "המשתמש";
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>(() =>
    parseFilterQueryParam(searchParams.get("assignees")),
  );
  const [selectedPriorities, setSelectedPriorities] = useState<
    TaskPriority[]
  >(() =>
    parseFilterQueryParam(searchParams.get("priorities")).filter(
      (priority): priority is TaskPriority =>
        TASK_PRIORITIES.includes(priority as TaskPriority),
    ),
  );
  const [selectedDueBefore, setSelectedDueBefore] = useState(
    () => searchParams.get("dueBefore") ?? "",
  );
  const suppressTaskClickRef = useRef(false);
  const suppressTaskClickTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!project) {
      setProjectMembers([]);
      return;
    }

    let active = true;

    void getUsersByIds(project.memberIds)
      .then((members) => {
        if (active) {
          setProjectMembers(members);
        }
      })
      .catch((nextError) => {
        if (!active) {
          return;
        }

        console.error("Failed to load task assignees", nextError);
        setProjectMembers([]);
      });

    return () => {
      active = false;
    };
  }, [project?.id, project?.memberIds.join("|")]);

  useEffect(() => {
    if (!project) {
      setTasks([]);
      setTasksLoading(true);
      setTasksError(null);
      return;
    }

    setTasksLoading(true);
    setTasksError(null);

    const unsubscribe = subscribeProjectTasks(
      project.id,
      (nextTasks) => {
        setTasks(nextTasks);
        setTasksLoading(false);
      },
      (nextError) => {
        console.error("Failed to load project tasks", nextError);
        setTasks([]);
        setTasksError("לא הצלחנו לטעון את המשימות.");
        setTasksLoading(false);
      },
    );

    return () => {
      unsubscribe();
    };
  }, [project?.id]);

  useEffect(() => {
    const nextSearchParams = new URLSearchParams();

    if (selectedAssigneeIds.length > 0) {
      nextSearchParams.set("assignees", selectedAssigneeIds.join(","));
    }

    if (selectedPriorities.length > 0) {
      nextSearchParams.set("priorities", selectedPriorities.join(","));
    }

    if (selectedDueBefore) {
      nextSearchParams.set("dueBefore", selectedDueBefore);
    }

    const nextSearch = nextSearchParams.toString();
    if (searchParams.toString() !== nextSearch) {
      setSearchParams(nextSearchParams, { replace: true });
    }
  }, [
    selectedAssigneeIds,
    selectedDueBefore,
    selectedPriorities,
    searchParams,
    setSearchParams,
  ]);

  useEffect(() => {
    if (taskDialogMode !== "edit" || !activeTaskId) {
      return;
    }

    const nextTask = tasks.find((task) => task.id === activeTaskId);
    if (!nextTask) {
      setTaskDialogMode(null);
      setActiveTaskId(null);
    }
  }, [activeTaskId, taskDialogMode, tasks]);

  useEffect(
    () => () => {
      if (suppressTaskClickTimerRef.current) {
        window.clearTimeout(suppressTaskClickTimerRef.current);
      }
    },
    [],
  );

  const memberById = useMemo(
    () => new Map(projectMembers.map((member) => [member.uid, member])),
    [projectMembers],
  );

  const filteredTasks = useMemo(
    () =>
      tasks.filter((task) => {
        const assigneeMatch =
          selectedAssigneeIds.length === 0 ||
          task.assigneeIds.some((assigneeId) =>
            selectedAssigneeIds.includes(assigneeId),
          );
        const priorityMatch =
          selectedPriorities.length === 0 ||
          selectedPriorities.includes(task.priority);
        const dueBeforeMatch =
          !selectedDueBefore ||
          (Boolean(task.dueDate) &&
            task.dueDate!.toMillis() <=
              new Date(`${selectedDueBefore}T23:59:59`).getTime());

        return assigneeMatch && priorityMatch && dueBeforeMatch;
      }),
    [selectedAssigneeIds, selectedDueBefore, selectedPriorities, tasks],
  );

  const taskColumns = useMemo(
    () => buildTaskBoardColumns(filteredTasks, memberById),
    [filteredTasks, memberById],
  );

  const hasActiveFilters =
    selectedAssigneeIds.length > 0 ||
    selectedPriorities.length > 0 ||
    Boolean(selectedDueBefore);
  const activeFilterCount =
    (selectedAssigneeIds.length > 0 ? 1 : 0) +
    (selectedPriorities.length > 0 ? 1 : 0) +
    (selectedDueBefore ? 1 : 0);
  const showEmptyState = hasActiveFilters && filteredTasks.length === 0;

  const assigneeOptions = useMemo(
    () => buildTaskAssigneeOptions(projectMembers),
    [projectMembers],
  );

  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === activeTaskId) ?? null,
    [activeTaskId, tasks],
  );

  const openTaskDialog = (task: ProjectTaskRecord) => {
    setTaskDialogMode("edit");
    setActiveTaskId(task.id);
    setTaskDialogError(null);
    setTaskSuggestionTitleError(null);
    setIsTaskSuggestionUsed(false);
    setTaskDraft(buildTaskDraftFromRecord(task));
  };

  const openCreateTaskDialog = () => {
    const defaultAssigneeId = getDefaultAssigneeId(
      project?.createdBy,
      user?.uid ?? null,
    );

    setTaskDialogMode("create");
    setActiveTaskId(null);
    setTaskDialogError(null);
    setTaskSuggestionTitleError(null);
    setIsTaskSuggestionUsed(false);
    setIsGeneratingTaskSuggestion(false);
    setTaskDraft(buildEmptyTaskDraft(defaultAssigneeId));
  };

  const closeTaskDialog = () => {
    setTaskDialogMode(null);
    setActiveTaskId(null);
    setTaskDialogError(null);
    setTaskSuggestionTitleError(null);
    setIsTaskSuggestionUsed(false);
    setIsSavingTask(false);
    setIsGeneratingTaskSuggestion(false);
  };

  const togglePriorityFilter = (priority: TaskPriority) => {
    setSelectedPriorities((current) =>
      current.includes(priority)
        ? current.filter((item) => item !== priority)
        : [...current, priority],
    );
  };

  const toggleAllPriorityFilters = () => {
    setSelectedPriorities((current) =>
      current.length === TASK_PRIORITIES.length ? [] : [...TASK_PRIORITIES],
    );
  };

  const toggleAssigneeFilter = (memberId: string) => {
    setSelectedAssigneeIds((current) =>
      current.includes(memberId)
        ? current.filter((id) => id !== memberId)
        : [...current, memberId],
    );
  };

  const toggleAllAssigneeFilters = () => {
    setSelectedAssigneeIds((current) =>
      current.length === assigneeOptions.length
        ? []
        : assigneeOptions.map((assignee) => assignee.id),
    );
  };

  const clearFilters = () => {
    setSelectedAssigneeIds([]);
    setSelectedPriorities([]);
    setSelectedDueBefore("");
  };

  const suppressNextTaskClick = () => {
    suppressTaskClickRef.current = true;

    if (suppressTaskClickTimerRef.current) {
      window.clearTimeout(suppressTaskClickTimerRef.current);
    }

    suppressTaskClickTimerRef.current = window.setTimeout(() => {
      suppressTaskClickRef.current = false;
      suppressTaskClickTimerRef.current = null;
    }, 180);
  };

  const getTaskSuggestionTitleError = (title: string): string | null => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      return "שדה חובה - יש להזין כותרת למשימה";
    }

    const letters = trimmedTitle.match(/[A-Za-zא-ת]/g) ?? [];
    const letterCount = letters.length;
    const words = trimmedTitle.split(/\s+/).filter(Boolean);
    const meaningfulWordCount = words.filter((word) => {
      const letterMatches = word.match(/[A-Za-zא-ת]/g) ?? [];
      return letterMatches.length >= 2;
    }).length;
    const isRepeatedCharacters =
      letterCount > 1 &&
      new Set(letters.map((char) => char.toLowerCase())).size === 1;

    if (
      letterCount === 0 ||
      isRepeatedCharacters ||
      (letterCount < 5 && meaningfulWordCount < 2)
    ) {
      return "כדי להשתמש ב-AI יש להזין כותרת משימה ברורה יותר";
    }

    return null;
  };

  const handleOpenActivitySummary = async (forceRefresh = false) => {
    if (!project || !user || isGeneratingActivitySummary) {
      return;
    }

    setIsActivitySummaryOpen(true);

    if (activitySummary && !forceRefresh) {
      return;
    }

    setIsGeneratingActivitySummary(true);
    setActivitySummaryError(null);
    setActivitySummaryCopyMessage(null);

    let fallbackActivitySummary: UserActivitySummaryResult | null = null;

    try {
      const profile = await getUserProfile(user.uid);
      const previousLoginAt = toActivityDate(profile?.previousLoginAt);
      const currentLoginAt = toActivityDate(profile?.lastLoginAt) ?? new Date();
      const fromDate = previousLoginAt ?? new Date(Date.now() - 24 * 60 * 60 * 1000);

      const userRelatedTasks = tasks
        .filter(
          (task) =>
            task.createdBy === user.uid || task.assigneeIds.includes(user.uid),
        )
        .sort((left, right) => right.updatedAt.toMillis() - left.updatedAt.toMillis());
      const relevantTasks = userRelatedTasks.filter(
        (task) => task.updatedAt.toMillis() > fromDate.getTime(),
      );
      const recentWorkTasks = relevantTasks.slice(0, 6);
      const completedTasks = recentWorkTasks.filter(
        (task) => task.status === "completed" || task.completed,
      );

      if (recentWorkTasks.length === 0) {
        const summary = createNoRecentActivitySummary();
        setActivitySummary(summary);
        return;
      }
      const mapTask = (task: ProjectTaskRecord) => ({
        id: task.id,
        projectName: project.name,
        title: task.title,
        description: getShortTaskDescription(task.description),
        status: task.status,
        priority: task.priority,
        difficulty: task.difficulty,
        dueDate: task.dueDate ? toActivityDateLabel(task.dueDate.toDate()) : null,
        updatedAt: toActivityDateLabel(task.updatedAt.toDate()),
        createdByCurrentUser: task.createdBy === user.uid,
        assignedToCurrentUser: task.assigneeIds.includes(user.uid),
      });

      fallbackActivitySummary = createFallbackActivitySummary(recentWorkTasks.map(mapTask));

      const summary = await generateUserActivitySummary({
        userName: user.displayName || user.email || "המשתמש",
        previousLoginAt: toActivityDateLabel(fromDate),
        currentLoginAt: toActivityDateLabel(currentLoginAt),
        updatedProjects:
          project.updatedAt.toMillis() > fromDate.getTime()
            ? [
                {
                  id: project.id,
                  name: project.name,
                  description: project.description,
                  updatedAt: toActivityDateLabel(project.updatedAt.toDate()),
                },
              ]
            : [],
        createdTasks: relevantTasks
          .filter(
            (task) =>
              task.createdBy === user.uid &&
              task.createdAt.toMillis() > fromDate.getTime(),
          )
          .map(mapTask),
        updatedTasks: recentWorkTasks.map(mapTask),
        completedTasks: completedTasks.map(mapTask),
        recentTasks: recentWorkTasks.map(mapTask),
      });

      await saveAiSummary({
        userId: user.uid,
        projectId: project.id,
        source: "taskBoard",
        headline: summary.headline,
        summaryLines: summary.summaryLines,
        highlights: summary.highlights,
        nextFocus: summary.nextFocus,
        context: {
          previousLoginAt: fromDate.toISOString(),
          currentLoginAt: currentLoginAt.toISOString(),
          completedTaskCount: completedTasks.length,
          recentWorkTaskCount: recentWorkTasks.length,
          relevantTaskCount: relevantTasks.length,
        },
      });

      setActivitySummary(summary);
    } catch (summaryError) {
      console.error("Failed to generate task activity summary", summaryError);
      setActivitySummary(fallbackActivitySummary ?? createNoRecentActivitySummary());
      setActivitySummaryError(null);
    } finally {
      setIsGeneratingActivitySummary(false);
    }
  };


  const handleCopyActivitySummary = async () => {
    if (!activitySummary) {
      return;
    }

    const message = activitySummary.summaryLines
      .map((line) => `- ${line}`)
      .join("\n");

    try {
      await navigator.clipboard.writeText(message);
      setActivitySummaryCopyMessage("הסיכום הועתק");
    } catch (copyError) {
      console.error("Failed to copy activity summary", copyError);
      setActivitySummaryCopyMessage("לא הצלחנו להעתיק כרגע");
    }
  };
  const handleTaskCardClick = (taskId: string) => {
    if (suppressTaskClickRef.current) {
      return;
    }

    const nextTask = tasks.find((task) => task.id === taskId);
    if (nextTask) {
      openTaskDialog(nextTask);
    }
  };

  const handleTaskDragStart =
    (taskId: string, sourceColumnId: TaskStatus) =>
    (event: React.DragEvent) => {
      setDraggedTaskId(taskId);
      setDragOverColumnId(sourceColumnId);
      suppressNextTaskClick();
      event.dataTransfer.effectAllowed = "move";

      try {
        event.dataTransfer.setData(
          "text/plain",
          JSON.stringify({ taskId, sourceColumnId }),
        );
      } catch {
        event.dataTransfer.setData("text/plain", taskId);
      }
    };

  const handleColumnDragOver =
    (columnId: TaskStatus) => (event: React.DragEvent) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      setDragOverColumnId(columnId);
    };

  const handleTaskDrop =
    (targetColumnId: TaskStatus) => (event: React.DragEvent) => {
      event.preventDefault();
      suppressNextTaskClick();

      let taskId = "";
      let sourceColumnId = "";

      try {
        const payload = JSON.parse(event.dataTransfer.getData("text/plain"));
        taskId = typeof payload.taskId === "string" ? payload.taskId : "";
        sourceColumnId =
          typeof payload.sourceColumnId === "string"
            ? payload.sourceColumnId
            : "";
      } catch {
        taskId = event.dataTransfer.getData("text/plain");
      }

      if (!taskId || !project) {
        setDraggedTaskId(null);
        setDragOverColumnId(null);
        return;
      }

      if (!sourceColumnId) {
        const sourceTask = tasks.find((task) => task.id === taskId);
        sourceColumnId = sourceTask?.status ?? "";
      }

      if (!sourceColumnId || sourceColumnId === targetColumnId) {
        setDraggedTaskId(null);
        setDragOverColumnId(null);
        return;
      }

      void updateProjectTask(project.id, taskId, {
        status: targetColumnId,
        completed: targetColumnId === "completed",
      }).catch((nextError) => {
        console.error("Failed to update task status", nextError);
        setTasksError("לא הצלחנו לשמור את שינוי הסטטוס.");
      });

      setDraggedTaskId(null);
      setDragOverColumnId(null);
    };

  const closeStatusMenu = () => {
    setStatusMenu(null);
  };

  const openStatusMenu = (
    taskId: string,
    event: React.MouseEvent<HTMLDivElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    suppressNextTaskClick();

    const menuWidth = 220;
    const menuHeight = 230;
    const nextX = Math.min(event.clientX, window.innerWidth - menuWidth - 12);
    const nextY = Math.min(event.clientY, window.innerHeight - menuHeight - 12);

    setStatusMenu({
      taskId,
      x: Math.max(12, nextX),
      y: Math.max(12, nextY),
    });
  };

  const handleMoveTaskStatus = async (taskId: string, nextStatus: TaskStatus) => {
    if (!project || movingTaskId) {
      return;
    }

    const task = tasks.find((item) => item.id === taskId);
    if (!task || task.status === nextStatus) {
      closeStatusMenu();
      return;
    }

    suppressNextTaskClick();
    setMovingTaskId(taskId);
    setTasksError(null);

    try {
      await updateProjectTask(project.id, taskId, {
        status: nextStatus,
        completed: nextStatus === "completed",
      });
      closeStatusMenu();
    } catch (nextError) {
      console.error("Failed to move task status", nextError);
      setTasksError("לא הצלחנו להזיז את המשימה לסטטוס החדש.");
    } finally {
      setMovingTaskId(null);
    }
  };
  const handleTaskDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverColumnId(null);
    suppressNextTaskClick();
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

  const handleDeleteTask = (taskId: string) => {
    if (!project || deletingTaskId) {
      return;
    }

    const task = tasks.find((item) => item.id === taskId);
    if (!task) {
      return;
    }

    suppressNextTaskClick();
    setTaskPendingDelete(task);
  };

  const closeDeleteTaskDialog = () => {
    if (deletingTaskId) {
      return;
    }

    setTaskPendingDelete(null);
  };

  const confirmDeleteTask = async () => {
    if (!project || !taskPendingDelete || deletingTaskId) {
      return;
    }

    const taskId = taskPendingDelete.id;
    setDeletingTaskId(taskId);
    setTasksError(null);

    try {
      await deleteProjectTask(project.id, taskId);
      if (activeTaskId === taskId) {
        closeTaskDialog();
      }
      setTaskPendingDelete(null);
    } catch (nextError) {
      console.error("Failed to delete task", nextError);
      setTasksError("לא הצלחנו למחוק את המשימה.");
    } finally {
      setDeletingTaskId(null);
    }
  };

  const handleTaskSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!project || !user) {
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
      if (taskDialogMode === "edit" && selectedTask) {
        await updateProjectTask(project.id, selectedTask.id, {
          title,
          description: taskDraft.description.trim() || null,
          priority: taskDraft.priority,
          difficulty: taskDraft.difficulty,
          status: taskDraft.status,
          dueDate,
          assigneeIds: taskDraft.assigneeIds,
          completed: taskDraft.status === "completed",
        });
      } else {
        await createProjectTask(project.id, {
          title,
          description: taskDraft.description.trim() || null,
          priority: taskDraft.priority,
          difficulty: taskDraft.difficulty,
          status: taskDraft.status,
          dueDate,
          assigneeIds: taskDraft.assigneeIds,
          completed: taskDraft.status === "completed",
          createdBy: user.uid,
        });
      }

      closeTaskDialog();
    } catch (nextError) {
      console.error("Failed to save task", nextError);
      setTaskDialogError("לא הצלחנו לשמור את המשימה.");
    } finally {
      setIsSavingTask(false);
    }
  };

  const handleGenerateTaskSuggestion = async () => {
    if (!project || isTaskSuggestionUsed || isGeneratingTaskSuggestion) {
      return;
    }

    const title = taskDraft.title.trim();
    const titleError = getTaskSuggestionTitleError(title);
    if (titleError) {
      setTaskSuggestionTitleError(titleError);
      setTaskDialogError(null);
      return;
    }

    const mapTaskSummary = (task: ProjectTaskRecord) => ({
      title: task.title,
      dueDate: toDateInputValue(task.dueDate?.toDate() ?? null) || undefined,
    });

    setTaskSuggestionTitleError(null);
    setIsGeneratingTaskSuggestion(true);
    setTaskDialogError(null);

    try {
      const completedTasks = tasks
        .filter((task) => task.status === "completed")
        .map(mapTaskSummary);
      const openTasks = tasks
        .filter((task) => task.status === "todo")
        .map(mapTaskSummary);
      const inProgressTasks = tasks
        .filter((task) => task.status === "inProgress")
        .map(mapTaskSummary);
      const reviewTasks = tasks
        .filter((task) => task.status === "review")
        .map(mapTaskSummary);

      const suggestion = await generateTaskSuggestion(
        project,
        title,
        completedTasks,
        openTasks,
        inProgressTasks,
        reviewTasks,
      );

      const combinedDescription = [
        ...suggestion.description,
        "",
        "דרך יעילה לביצוע:",
        ...suggestion.suggestedApproach,
      ].join("\n");

      setTaskDraft((current) => ({
        ...current,
        description: combinedDescription,
        priority: suggestion.priority,
        difficulty: suggestion.difficulty,
        dueDate: suggestion.recommendedDueDate,
      }));
      setIsTaskSuggestionUsed(true);
    } catch (nextError) {
      console.error("Failed to generate task suggestion", nextError);
      setTaskDialogError(
        "לא הצלחנו לקבל הצעה מה-AI. נסה שוב או ערוך ידנית את המשימה.",
      );
    } finally {
      setIsGeneratingTaskSuggestion(false);
    }
  };

  const currentTaskMembers =
    taskDialogMode === "edit" && selectedTask
      ? selectedTask.assigneeIds.map((memberId) => {
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
        })
      : assigneeOptions.filter((member) =>
          taskDraft.assigneeIds.includes(member.id),
        );

  if (loading) {
    return (
      <PageSection className="tasks-page">
        <div className="tasks-page__state">טוען סביבת עבודה...</div>
      </PageSection>
    );
  }

  if (error) {
    return (
      <PageSection className="tasks-page">
        <div className="tasks-page__state">{error}</div>
      </PageSection>
    );
  }

  if (!project) {
    return <Navigate to="/projects" replace />;
  }

  const statusMessage =
    tasksError ??
    (tasksLoading && tasks.length === 0 ? "טוען משימות..." : null);

  return (
    <PageSection className="tasks-page" aria-labelledby="tasks-page-title">
      <div className="tasks-page__hero">
        <SectionTitle
          title="לוח משימות"
          subtitle="ניהול משימות לכל הקבוצות הפעילות."
        />

        <div className="tasks-page__actions" aria-label="פקדי לוח">
          <div
            className="tasks-page__toggle"
            role="tablist"
            aria-label="תצוגת לוח"
          >
            <button
              className={`tasks-page__toggle-item${boardView === "board" ? " is-active" : ""}`}
              type="button"
              role="tab"
              aria-selected={boardView === "board"}
              onClick={() => setBoardView("board")}
            >
              לוח
            </button>
            <button
              className={`tasks-page__toggle-item${boardView === "list" ? " is-active" : ""}`}
              type="button"
              role="tab"
              aria-selected={boardView === "list"}
              onClick={() => setBoardView("list")}
            >
              רשימה
            </button>
          </div>

          <Button
            variant="secondary"
            size="md"
            type="button"
            className={`tasks-page__filter-button${hasActiveFilters ? " is-active" : ""}`}
            onClick={() => setIsFilterOpen((current) => !current)}
          >
            <Filter size={16} />
            סינון
            {hasActiveFilters ? (
              <span className="tasks-page__filter-count">
                {activeFilterCount}
              </span>
            ) : null}
          </Button>
          <Button
            variant="secondary"
            size="md"
            type="button"
            className="tasks-page__activity-button"
            onClick={() => void handleOpenActivitySummary()}
            disabled={isGeneratingActivitySummary}
          >
            <Sparkles size={16} />
            סיכום
          </Button>

          <Button
            size="md"
            type="button"
            className="tasks-page__add-button"
            onClick={openCreateTaskDialog}
          >
            <Plus size={16} />
            הוספת משימה
          </Button>
        </div>
      </div>
      {isFilterOpen ? (
        <div
          className="tasks-page__filter-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setIsFilterOpen(false);
            }
          }}
        >
          <div
            className="tasks-page__filter-panel"
            role="dialog"
            aria-modal="true"
            aria-label="סינון משימות"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="tasks-page__filter-header">
              <div>
                <div className="tasks-page__filter-heading">סינון משימות</div>
                <p className="tasks-page__filter-subtitle">
                  בחרי אחראים, עדיפות ותאריך יעד להצגת המשימות הרלוונטיות.
                </p>
              </div>
              <button
                type="button"
                className="tasks-page__filter-close"
                onClick={() => setIsFilterOpen(false)}
                aria-label="סגירת סיכום"
              >
                <X size={18} />
              </button>
            </div>

            <div className="tasks-page__filter-content">
              <section className="tasks-page__filter-section">
                <div className="tasks-page__filter-section-heading">
                  <div className="tasks-page__filter-section-title">עדיפות</div>
                  <button
                    type="button"
                    className="tasks-page__filter-select-all"
                    onClick={toggleAllPriorityFilters}
                  >
                    {selectedPriorities.length === TASK_PRIORITIES.length
                      ? "נקה הכל"
                      : "בחר הכל"}
                  </button>
                </div>
                <div className="tasks-page__filter-group">
                  {TASK_PRIORITIES.map((priority) => {
                    const isSelected = selectedPriorities.includes(priority);
                    return (
                      <label
                        key={priority}
                        className={`tasks-page__filter-option${isSelected ? " is-selected" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => togglePriorityFilter(priority)}
                        />
                        <span>{TASK_PRIORITY_LABELS[priority]}</span>
                      </label>
                    );
                  })}
                </div>
              </section>

              <section className="tasks-page__filter-section">
                <div className="tasks-page__filter-section-heading">
                  <div className="tasks-page__filter-section-title">אחראים</div>
                  {assigneeOptions.length > 0 ? (
                    <button
                      type="button"
                      className="tasks-page__filter-select-all"
                      onClick={toggleAllAssigneeFilters}
                    >
                      {selectedAssigneeIds.length === assigneeOptions.length
                        ? "נקה הכל"
                      : "בחר הכל"}
                    </button>
                  ) : null}
                </div>
                <div className="tasks-page__filter-group tasks-page__filter-group--scroll">
                  {assigneeOptions.length > 0 ? (
                    assigneeOptions.map((assignee) => {
                      const isSelected = selectedAssigneeIds.includes(assignee.id);
                      return (
                        <label
                          key={assignee.id}
                          className={`tasks-page__filter-option${isSelected ? " is-selected" : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleAssigneeFilter(assignee.id)}
                          />
                          <span>
                            {assignee.displayName ?? assignee.email ?? assignee.id}
                          </span>
                        </label>
                      );
                    })
                  ) : (
                    <div className="tasks-page__filter-empty">
                      לא נמצאו משתמשים זמינים.
                    </div>
                  )}
                </div>
              </section>

              <section className="tasks-page__filter-section">
                <div className="tasks-page__filter-section-title">עד תאריך יעד</div>
                <label className="tasks-page__filter-date-field">
                  <span>הציגי משימות שמועד היעד שלהן עד:</span>
                  <input
                    type="date"
                    value={selectedDueBefore}
                    onChange={(event) => setSelectedDueBefore(event.target.value)}
                  />
                </label>
              </section>
            </div>

            <div className="tasks-page__filter-actions">
              <Button
                variant="secondary"
                size="sm"
                type="button"
                onClick={clearFilters}
              >
                נקה סינון
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="button"
                onClick={() => setIsFilterOpen(false)}
              >
                הצג תוצאות
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {statusMessage ? (
        <div
          className={`tasks-page__notice${tasksError ? " tasks-page__notice--error" : ""}`}
          role={tasksError ? "alert" : "status"}
          aria-live="polite"
        >
          {tasksError ? (
            <TriangleAlert size={16} />
          ) : (
            <SlidersHorizontal size={16} />
          )}
          <span>{statusMessage}</span>
        </div>
      ) : null}

      {showEmptyState ? (
        <div className="tasks-page__empty-state" role="status" aria-live="polite">
          <TriangleAlert size={20} />
          <span>לא נמצאו משימות שתואמות לסינון</span>
        </div>
      ) : boardView === "board" ? (
        <div className="tasks-page__board" aria-label="עמודות לוח המשימות">
          {taskColumns.map((column) => (
            <section
              key={column.id}
              className={`tasks-page__column tasks-page__column--${column.tone}${dragOverColumnId === column.id ? " is-drag-over" : ""}`}
              aria-labelledby={`column-${column.id}-title`}
              onDragOver={handleColumnDragOver(column.id)}
              onDrop={handleTaskDrop(column.id)}
            >
              <header className="tasks-page__column-header">
                <div className="tasks-page__column-title-wrap">
                  <span className="tasks-page__column-dot" aria-hidden="true" />
                  <h2
                    className="tasks-page__column-title"
                    id={`column-${column.id}-title`}
                  >
                    {column.title}
                  </h2>
                  <span className="tasks-page__column-count">
                    {column.count}
                  </span>
                </div>
                {/* <button
                  className="tasks-page__column-menu"
                  type="button"
                  aria-label={`More options for ${column.title}`}
                >
                  <MoreHorizontal size={18} strokeWidth={2} />
                </button> */}
              </header>

              <div
                className="tasks-page__cards"
                onDragOver={handleColumnDragOver(column.id)}
                onDrop={handleTaskDrop(column.id)}
              >
                {column.tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    isDragging={draggedTaskId === task.id}
                    onClick={() => handleTaskCardClick(task.id)}
                    onContextMenu={(event) => openStatusMenu(task.id, event)}
                    onDragStart={handleTaskDragStart(task.id, column.id)}
                    onDragEnd={handleTaskDragEnd}
                    onDelete={handleDeleteTask}
                    isDeleting={deletingTaskId === task.id}
                  />
                ))}
                <div
                  className="tasks-page__drop-sentinel"
                  onDragOver={handleColumnDragOver(column.id)}
                  onDrop={handleTaskDrop(column.id)}
                />
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="tasks-page__list-view" aria-live="polite">
          <div className="tasks-page__list-header">
            <SlidersHorizontal size={16} />
            תצוגת הרשימה שומרת על המשימות זמינות גם במסכים קטנים.
          </div>
          <div className="tasks-page__list-grid">
            {taskColumns
              .flatMap((column) => column.tasks)
              .map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onClick={() => handleTaskCardClick(task.id)}
                  onContextMenu={(event) => openStatusMenu(task.id, event)}
                  onDragEnd={handleTaskDragEnd}
                  onDelete={handleDeleteTask}
                  isDeleting={deletingTaskId === task.id}
                />
              ))}
          </div>
        </div>
      )}

      {isActivitySummaryOpen ? (
        <div
          className="tasks-page__dialog-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setIsActivitySummaryOpen(false);
            }
          }}
        >
          <GlassPanel
            className="tasks-page__dialog tasks-page__activity-dialog"
            intensity="strong"
            role="dialog"
            aria-modal="true"
            aria-labelledby="tasks-activity-summary-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="tasks-page__dialog-header">
              <div className="tasks-page__dialog-heading">
                <p className="tasks-page__dialog-eyebrow">AI</p>
                <h2 id="tasks-activity-summary-title" className="tasks-page__dialog-title">
                  סיכום
                </h2>
                <p className="tasks-page__dialog-subtitle">
                  מכין סיכום עבור הפעילות האחרונה של "{activitySummaryUserName}"
                </p>
              </div>
              <button
                type="button"
                className="tasks-page__dialog-close"
                onClick={() => setIsActivitySummaryOpen(false)}
                aria-label="סגירת סיכום"
              >
                <X size={18} />
              </button>
            </div>

            {activitySummaryError ? (
              <p className="tasks-page__dialog-error">{activitySummaryError}</p>
            ) : null}

            {isGeneratingActivitySummary ? (
              <div className="tasks-page__activity-loading">מכין סיכום פעילות אחרונה</div>
            ) : null}

            {activitySummary ? (
              <div className="tasks-page__activity-content">
                {activitySummary.summaryLines.length === 1 &&
                activitySummary.summaryLines[0] === activitySummary.headline ? null : (
                  <strong>{activitySummary.headline}</strong>
                )}
                <ul>
                  {activitySummary.summaryLines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="tasks-page__dialog-actions">
              <button
                type="button"
                className="tasks-page__copy-icon-button"
                onClick={() => void handleCopyActivitySummary()}
                disabled={!activitySummary || isGeneratingActivitySummary}
                aria-label="העתקת הסיכום"
                title="העתקת הסיכום"
              >
                <Copy size={18} />
              </button>
              {activitySummaryCopyMessage ? (
                <span className="tasks-page__copy-message">{activitySummaryCopyMessage}</span>
              ) : null}
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => {
                  setActivitySummary(null);
                  void handleOpenActivitySummary(true);
                }}
                disabled={isGeneratingActivitySummary}
              >
                ניסוח מחדש
              </Button>
              <Button
                type="button"
                size="md"
                onClick={() => setIsActivitySummaryOpen(false)}
              >
                סגור
              </Button>
            </div>
          </GlassPanel>
        </div>
      ) : null}
      {statusMenu ? (
        <div
          className="tasks-page__status-menu-backdrop"
          role="presentation"
          onMouseDown={closeStatusMenu}
          onContextMenu={(event) => {
            event.preventDefault();
            closeStatusMenu();
          }}
        >
          <div
            className="tasks-page__status-menu"
            role="menu"
            aria-label="העברת משימה לסטטוס"
            style={{ top: statusMenu.y, left: statusMenu.x }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="tasks-page__status-menu-title">העברה לסטטוס</div>
            {TASK_STATUS_ORDER.map((status) => {
              const task = tasks.find((item) => item.id === statusMenu.taskId);
              const isCurrent = task?.status === status;

              return (
                <button
                  key={status}
                  type="button"
                  role="menuitem"
                  className={`tasks-page__status-menu-item${isCurrent ? " is-current" : ""}`}
                  disabled={isCurrent || movingTaskId === statusMenu.taskId}
                  onClick={() => void handleMoveTaskStatus(statusMenu.taskId, status)}
                >
                  <span>{TASK_STATUS_LABELS[status]}</span>
                  {isCurrent ? <span>נוכחי</span> : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {taskPendingDelete ? (
        <div
          className="tasks-page__dialog-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeDeleteTaskDialog();
            }
          }}
        >
          <GlassPanel
            className="tasks-page__dialog tasks-page__delete-dialog"
            intensity="strong"
            role="dialog"
            aria-modal="true"
            aria-labelledby="task-delete-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="tasks-page__dialog-header">
              <div className="tasks-page__dialog-heading">
                <p className="tasks-page__dialog-eyebrow">מחיקת משימה</p>
                <h2 id="task-delete-title" className="tasks-page__dialog-title">
                  למחוק את המשימה?
                </h2>
                <p className="tasks-page__dialog-subtitle">
                  הפעולה תמחק את המשימה מהלוח ולא תוצג יותר בפרויקט.
                </p>
              </div>
              <button
                type="button"
                className="tasks-page__dialog-close"
                onClick={closeDeleteTaskDialog}
                disabled={Boolean(deletingTaskId)}
                aria-label="סגירת חלון מחיקה"
              >
                <X size={18} />
              </button>
            </div>

            <div className="tasks-page__delete-dialog-body">
              <TriangleAlert size={22} />
              <span>{taskPendingDelete.title}</span>
            </div>

            <div className="tasks-page__dialog-actions">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={closeDeleteTaskDialog}
                disabled={Boolean(deletingTaskId)}
              >
                ביטול
              </Button>
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={() => void confirmDeleteTask()}
                disabled={Boolean(deletingTaskId)}
              >
                {deletingTaskId ? "מוחק..." : "מחיקת משימה"}
              </Button>
            </div>
          </GlassPanel>
        </div>
      ) : null}

      <TaskDialog
        isOpen={Boolean(taskDialogMode)}
        mode={taskDialogMode ?? "create"}
        draft={taskDraft}
        setDraft={setTaskDraft}
        statusOptions={TASK_STATUS_ORDER}
        statusLabels={TASK_STATUS_LABELS}
        priorityLabels={TASK_PRIORITY_LABELS}
        assigneeOptions={assigneeOptions}
        currentTaskMembers={
          taskDialogMode === "edit" && selectedTask ? currentTaskMembers : []
        }
        onToggleAssignee={toggleTaskAssignee}
        onGenerateSuggestion={handleGenerateTaskSuggestion}
        isAiGenerating={isGeneratingTaskSuggestion}
        isAiSuggestionUsed={isTaskSuggestionUsed}
        aiTitleError={taskSuggestionTitleError}
        onClearAiTitleError={() => setTaskSuggestionTitleError(null)}
        onClose={closeTaskDialog}
        onSubmit={handleTaskSubmit}
        error={taskDialogError}
        isSaving={isSavingTask}
      />
    </PageSection>
  );
};


