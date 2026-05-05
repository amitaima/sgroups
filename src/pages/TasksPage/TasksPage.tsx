import { useState, useCallback } from "react";
import { Navigate, useParams } from "react-router-dom";
import { Button } from "@components/ui/Button/Button";
import { PageSection } from "@components/layout/PageSection/PageSection";
import { SectionTitle } from "@components/ui/SectionTitle/SectionTitle";
import { TaskCard } from "@components/dashboard/TaskCard";
import { useWorkspaceProject } from "@hooks/useWorkspaceProject";
import { Filter, MoreHorizontal, Plus, SlidersHorizontal } from "lucide-react";
import type { TaskBoardColumnData } from "./TasksPage.types";
import "./TasksPage.scss";

const TASK_ASSIGNEES = {
  naomi: { id: "naomi", displayName: "Naomi", email: null, photoURL: null },
  yotam: { id: "yotam", displayName: "Yotam", email: null, photoURL: null },
  shira: { id: "shira", displayName: "Shira", email: null, photoURL: null },
  daniel: { id: "daniel", displayName: "Daniel", email: null, photoURL: null },
} as const;

const buildColumns = (): TaskBoardColumnData[] => [
  {
    id: "todo",
    title: "To Do",
    count: 3,
    tone: "neutral",
    tasks: [
      {
        id: "research-sources",
        title: "Research Literature Review Sources",
        description:
          "Compile an initial list of at least 15 peer-reviewed articles focusing on cognitive load theory.",
        priority: "high",
        status: "todo",
        dueDateLabel: "Oct 24",
        assignees: [TASK_ASSIGNEES.naomi],
      },
      {
        id: "annotated-bibliography",
        title: "Build Annotated Bibliography Draft",
        description:
          "Group the sources by theme and add short notes on methodology and relevance.",
        priority: "medium",
        status: "todo",
        dueDateLabel: "Oct 26",
        assignees: [TASK_ASSIGNEES.shira, TASK_ASSIGNEES.daniel],
      },
      {
        id: "outline-followup",
        title: "Confirm chapter outline with supervisor",
        description:
          "Review the latest outline revision and gather feedback before the next sync.",
        priority: "low",
        status: "todo",
        dueDateLabel: "Oct 28",
        assignees: [TASK_ASSIGNEES.yotam],
      },
    ],
  },
  {
    id: "inProgress",
    title: "In Progress",
    count: 2,
    tone: "teal",
    tasks: [
      {
        id: "introduction-section",
        title: "Draft Introduction Section",
        description:
          "Write the first 3 pages outlining the thesis statement and general background.",
        priority: "medium",
        status: "inProgress",
        dueDateLabel: "Yesterday",
        overdue: true,
        assignees: [TASK_ASSIGNEES.yotam, TASK_ASSIGNEES.naomi],
      },
      {
        id: "methodology-outline",
        title: "Finalize Methodology Outline",
        description:
          "Map the experiment flow and list the instruments required for the pilot study.",
        priority: "medium",
        status: "inProgress",
        dueDateLabel: "Oct 30",
        assignees: [TASK_ASSIGNEES.shira],
      },
    ],
  },
  {
    id: "review",
    title: "Review",
    count: 1,
    tone: "olive",
    tasks: [
      {
        id: "apa-formatting",
        title: "Format Citations (APA)",
        priority: "low",
        status: "review",
        dueDateLabel: "Oct 28",
        assignees: [TASK_ASSIGNEES.daniel],
      },
    ],
  },
  {
    id: "completed",
    title: "Completed",
    count: 4,
    tone: "primary",
    tasks: [
      {
        id: "presentation-shell",
        title: "Create Presentation Deck Shell",
        priority: "medium",
        status: "completed",
        dueDateLabel: "Oct 20",
        completed: true,
        assignees: [TASK_ASSIGNEES.naomi],
      },
      {
        id: "source-matrix",
        title: "Build source tracking matrix",
        priority: "low",
        status: "completed",
        dueDateLabel: "Oct 18",
        completed: true,
        assignees: [TASK_ASSIGNEES.shira],
      },
    ],
  },
];

export const TasksPage = () => {
  const { projectId } = useParams();
  const { project, loading, error } = useWorkspaceProject(projectId);
  const [boardView, setBoardView] = useState<"board" | "list">("board");
  const [columnsData, setColumnsData] = useState<TaskBoardColumnData[]>(() =>
    buildColumns(),
  );
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  const handleTaskDragStart = useCallback(
    (taskId: string, sourceColumnId: string) => (e: React.DragEvent) => {
      setDraggedTaskId(taskId);
      e.dataTransfer.effectAllowed = "move";
      // set both a custom type and a plain fallback for compatibility
      try {
        e.dataTransfer.setData("text/task", taskId);
        e.dataTransfer.setData("text/source", sourceColumnId);
        e.dataTransfer.setData(
          "text/plain",
          JSON.stringify({ taskId, sourceColumnId }),
        );
      } catch (err) {
        // some environments may restrict types; still attempt plain
        try {
          e.dataTransfer.setData("text/plain", taskId);
        } catch (e2) {
          // ignore
        }
      }
    },
    [],
  );

  const handleColumnDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleTaskDrop = useCallback(
    (targetColumnId: string) => (e: React.DragEvent) => {
      e.preventDefault();
      // Try multiple retrieval strategies for cross-browser compatibility
      let taskId =
        e.dataTransfer.getData("text/task") || e.dataTransfer.getData("taskId");
      let sourceColumnId =
        e.dataTransfer.getData("text/source") ||
        e.dataTransfer.getData("sourceColumn");

      if (!taskId) {
        const plain = e.dataTransfer.getData("text/plain");
        if (plain) {
          try {
            const parsed = JSON.parse(plain);
            taskId = taskId || parsed.taskId || parsed.id;
            sourceColumnId =
              sourceColumnId || parsed.sourceColumnId || parsed.source;
          } catch (_err) {
            // fallback: plain string could be the id
            taskId = taskId || plain;
          }
        }
      }

      if (!taskId || !sourceColumnId) return;
      if (sourceColumnId === targetColumnId) {
        setDraggedTaskId(null);
        return;
      }

      setColumnsData((prev) => {
        const newColumns = prev.map((col) => ({ ...col }));
        const sourceCol = newColumns.find((col) => col.id === sourceColumnId);
        const targetCol = newColumns.find((col) => col.id === targetColumnId);

        if (!sourceCol || !targetCol) return prev;

        const taskIndex = sourceCol.tasks.findIndex((t) => t.id === taskId);
        if (taskIndex === -1) return prev;

        const [task] = sourceCol.tasks.splice(taskIndex, 1);
        task.status = targetColumnId as any;
        targetCol.tasks.push(task);

        sourceCol.count = sourceCol.tasks.length;
        targetCol.count = targetCol.tasks.length;

        return newColumns;
      });

      setDraggedTaskId(null);
    },
    [],
  );

  const handleTaskDragEnd = useCallback(() => {
    setDraggedTaskId(null);
  }, []);

  if (loading) {
    return (
      <PageSection className="tasks-page">
        <div className="tasks-page__state">Loading workspace...</div>
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

  return (
    <PageSection className="tasks-page" aria-labelledby="tasks-page-title">
      <div className="tasks-page__hero">
        <SectionTitle
          title="Team Board"
          subtitle="Manage tasks across all active groups."
        />

        <div className="tasks-page__actions" aria-label="Board controls">
          <div
            className="tasks-page__toggle"
            role="tablist"
            aria-label="Board view"
          >
            <button
              className={`tasks-page__toggle-item${boardView === "board" ? " is-active" : ""}`}
              type="button"
              role="tab"
              aria-selected={boardView === "board"}
              onClick={() => setBoardView("board")}
            >
              Board
            </button>
            <button
              className={`tasks-page__toggle-item${boardView === "list" ? " is-active" : ""}`}
              type="button"
              role="tab"
              aria-selected={boardView === "list"}
              onClick={() => setBoardView("list")}
            >
              List
            </button>
          </div>

          <Button
            variant="secondary"
            size="md"
            type="button"
            className="tasks-page__filter-button"
          >
            <Filter size={16} />
            Filters
          </Button>

          <Button size="md" type="button" className="tasks-page__add-button">
            <Plus size={16} />
            Add Task
          </Button>
        </div>
      </div>

      {boardView === "board" ? (
        <div className="tasks-page__board" aria-label="Task board columns">
          {columnsData.map((column) => (
            <section
              key={column.id}
              className={`tasks-page__column tasks-page__column--${column.tone}`}
              aria-labelledby={`column-${column.id}-title`}
              onDragOver={handleColumnDragOver}
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
                <button
                  className="tasks-page__column-menu"
                  type="button"
                  aria-label={`More options for ${column.title}`}
                >
                  <MoreHorizontal size={18} strokeWidth={2} />
                </button>
              </header>

              <div
                className="tasks-page__cards"
                onDragOver={handleColumnDragOver}
                onDrop={handleTaskDrop(column.id)}
              >
                {column.tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    isDragging={draggedTaskId === task.id}
                    onDragStart={handleTaskDragStart(task.id, column.id)}
                    onDragEnd={handleTaskDragEnd}
                  />
                ))}
                {/* Invisible sentinel to catch drops into whitespace below last card */}
                <div
                  className="tasks-page__drop-sentinel"
                  onDragOver={handleColumnDragOver}
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
            List view is ready for future table data.
          </div>
          <div className="tasks-page__list-grid">
            {columnsData
              .flatMap((column) => column.tasks)
              .map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onDragEnd={handleTaskDragEnd}
                />
              ))}
          </div>
        </div>
      )}
    </PageSection>
  );
};
