import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { Filter, Plus, SlidersHorizontal, TriangleAlert } from "lucide-react";
import { useAuth } from "@app/providers/AuthProvider";
import { Button } from "@components/ui/Button/Button";
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
  getUsersByIds,
  subscribeProjectTasks,
  updateProjectTask,
} from "@services/firebase/firebase";
import type { TaskCardData } from "@components/dashboard/TaskCard";
import type { TaskPriority, TaskStatus, TaskDifficulty } from "../../types/common";
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

  const taskColumns = useMemo(
    () => buildTaskBoardColumns(tasks, memberById),
    [memberById, tasks],
  );

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
    setTaskDraft(buildEmptyTaskDraft(defaultAssigneeId));
  };

  const closeTaskDialog = () => {
    setTaskDialogMode(null);
    setActiveTaskId(null);
    setTaskDialogError(null);
    setIsSavingTask(false);
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
            className="tasks-page__filter-button"
          >
            <Filter size={16} />
            סינון
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

      {boardView === "board" ? (
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
                    onDragStart={handleTaskDragStart(task.id, column.id)}
                    onDragEnd={handleTaskDragEnd}
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
                  onDragEnd={handleTaskDragEnd}
                />
              ))}
          </div>
        </div>
      )}

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
        onClose={closeTaskDialog}
        onSubmit={handleTaskSubmit}
        error={taskDialogError}
        isSaving={isSavingTask}
      />
    </PageSection>
  );
};
