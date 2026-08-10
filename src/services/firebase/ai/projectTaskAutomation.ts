import { taskSuggestionModel } from "../firebase";
import type {
  ProjectTaskAutomationInput,
  ProjectTaskAutomationResult,
  ProjectTaskAutomationTask,
  ProjectTaskDifficultyEstimate,
} from "./projectTaskAutomation.types";

const VALID_PRIORITIES = ["high", "medium", "low"] as const;
const VALID_DIFFICULTIES = ["easy", "medium", "hard"] as const;
const VALID_STATUSES = ["todo"] as const;

const extractJsonObject = (text: string): string => {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) {
    return trimmed;
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("AI response did not contain JSON object.");
  }

  return trimmed.slice(start, end + 1);
};

const extractJsonArray = (text: string): string => {
  const trimmed = text.trim();
  if (trimmed.startsWith("[")) {
    return trimmed;
  }

  const start = trimmed.indexOf("[");
  const end = trimmed.lastIndexOf("]");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("AI response did not contain JSON array.");
  }

  return trimmed.slice(start, end + 1);
};

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const clampDifficulty = (value: number): number =>
  Math.max(1, Math.min(10, Math.round(value)));

const getTaskCount = (difficulty: number): number =>
  clampDifficulty(difficulty) * 3;

const TASK_DIFFICULTY_WORKLOAD_WEIGHT: Record<
  ProjectTaskAutomationTask["difficulty"],
  number
> = {
  easy: 1,
  medium: 2,
  hard: 3,
};

const formatDateForPrompt = (value: Date | null | undefined): string => {
  if (!value) {
    return "";
  }

  return value.toISOString();
};

const parseDateValue = (value: unknown): Date | null => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const distributeDueDates = (
  tasks: ProjectTaskAutomationTask[],
  finalSubmissionAt?: Date | null,
): ProjectTaskAutomationTask[] => {
  if (!finalSubmissionAt) {
    return tasks;
  }

  const deadline = new Date(finalSubmissionAt);
  if (Number.isNaN(deadline.getTime())) {
    return tasks;
  }

  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 1);
  startDate.setHours(0, 0, 0, 0);

  deadline.setHours(23, 59, 59, 999);

  const taskCount = tasks.length;
  if (taskCount === 1) {
    return tasks.map((task) => ({
      ...task,
      dueDate: deadline,
    }));
  }

  const windowMs = Math.max(0, deadline.getTime() - startDate.getTime());
  const intervalMs = Math.max(
    24 * 60 * 60 * 1000,
    Math.floor(windowMs / Math.max(1, taskCount - 1)),
  );

  return tasks.map((task, index) => {
    const dueDate = new Date(startDate.getTime() + index * intervalMs);
    if (dueDate.getTime() > deadline.getTime()) {
      return {
        ...task,
        dueDate: deadline,
      };
    }

    return {
      ...task,
      dueDate,
    };
  });
};

const balanceAssignees = (
  tasks: ProjectTaskAutomationTask[],
  projectMemberIds: string[],
): ProjectTaskAutomationTask[] => {
  if (projectMemberIds.length === 0) {
    return tasks;
  }

  const workloadByMember = new Map(
    projectMemberIds.map((memberId) => [memberId, 0]),
  );
  const allowedMemberIds = new Set(projectMemberIds);
  const assignments = new Map<ProjectTaskAutomationTask, string>();

  [...tasks]
    .sort(
      (left, right) =>
        TASK_DIFFICULTY_WORKLOAD_WEIGHT[right.difficulty] -
        TASK_DIFFICULTY_WORKLOAD_WEIGHT[left.difficulty],
    )
    .forEach((task) => {
      const taskWeight = TASK_DIFFICULTY_WORKLOAD_WEIGHT[task.difficulty];
      const aiAssigneeId = task.assigneeIds.find((assigneeId) =>
        allowedMemberIds.has(assigneeId),
      );
      const lowestWorkload = Math.min(...workloadByMember.values());
      const fallbackAssigneeId =
        projectMemberIds.find(
          (memberId) => workloadByMember.get(memberId) === lowestWorkload,
        ) ?? projectMemberIds[0];
      const selectedAssigneeId =
        aiAssigneeId &&
        (workloadByMember.get(aiAssigneeId) ?? 0) <= lowestWorkload
          ? aiAssigneeId
          : fallbackAssigneeId;

      assignments.set(task, selectedAssigneeId);
      workloadByMember.set(
        selectedAssigneeId,
        (workloadByMember.get(selectedAssigneeId) ?? 0) + taskWeight,
      );
    });

  return tasks.map((task) => ({
    ...task,
    assigneeIds: [assignments.get(task) ?? projectMemberIds[0]],
  }));
};

const normalizeAssigneeIds = (
  value: unknown,
  allowedAssigneeIds: string[],
): string[] => {
  if (!Array.isArray(value) || allowedAssigneeIds.length === 0) {
    return [];
  }

  const allowed = new Set(allowedAssigneeIds);
  return Array.from(
    new Set(
      value
        .map((assigneeId) =>
          typeof assigneeId === "string" ? assigneeId.trim() : "",
        )
        .filter((assigneeId) => Boolean(assigneeId) && allowed.has(assigneeId)),
    ),
  );
};

const validateDifficultyEstimate = (
  value: unknown,
): ProjectTaskDifficultyEstimate => {
  if (!value || typeof value !== "object") {
    throw new Error("AI response is not an object.");
  }

  const data = value as Record<string, unknown>;
  const difficultyValue =
    typeof data.difficulty === "number" ? data.difficulty : NaN;

  if (!Number.isFinite(difficultyValue)) {
    throw new Error("AI response is missing a numeric difficulty.");
  }

  return {
    difficulty: clampDifficulty(difficultyValue),
  };
};

const validateProjectTask = (
  value: unknown,
  allowedAssigneeIds: string[],
): ProjectTaskAutomationTask => {
  if (!value || typeof value !== "object") {
    throw new Error("Task item is not an object.");
  }

  const data = value as Record<string, unknown>;
  const title = isNonEmptyString(data.title) ? data.title.trim() : "";
  const description = isNonEmptyString(data.description)
    ? data.description.trim()
    : "";
  const priority = isNonEmptyString(data.priority) ? data.priority.trim() : "";
  const difficulty = isNonEmptyString(data.difficulty)
    ? data.difficulty.trim()
    : "";
  const status = isNonEmptyString(data.status) ? data.status.trim() : "";

  if (!title || !description) {
    throw new Error("AI task is missing a title or description.");
  }

  if (
    !VALID_PRIORITIES.includes(priority as (typeof VALID_PRIORITIES)[number])
  ) {
    throw new Error("AI task has an invalid priority.");
  }

  if (
    !VALID_DIFFICULTIES.includes(
      difficulty as (typeof VALID_DIFFICULTIES)[number],
    )
  ) {
    throw new Error("AI task has an invalid difficulty.");
  }

  if (!VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
    throw new Error("AI task has an invalid status.");
  }

  return {
    title,
    description,
    priority: priority as ProjectTaskAutomationTask["priority"],
    difficulty: difficulty as ProjectTaskAutomationTask["difficulty"],
    status: "todo",
    assigneeIds: normalizeAssigneeIds(data.assigneeIds, allowedAssigneeIds),
    dueDate: parseDateValue(data.dueDate),
    completed: false,
  };
};

const validateProjectTaskList = (
  value: unknown,
  allowedAssigneeIds: string[],
  expectedCount: number,
): ProjectTaskAutomationTask[] => {
  if (!Array.isArray(value)) {
    throw new Error("AI response is not an array.");
  }

  if (value.length !== expectedCount) {
    throw new Error(
      `AI returned ${value.length} tasks instead of ${expectedCount}.`,
    );
  }

  return value.map((item) => validateProjectTask(item, allowedAssigneeIds));
};

const buildMemberProfilesBlock = (input: ProjectTaskAutomationInput): string => {
  if (!input.memberProfiles || input.memberProfiles.length === 0) {
    return "[]";
  }

  return JSON.stringify(
    input.memberProfiles.map((member) => ({
      id: member.id,
      name: member.displayName ?? member.email ?? member.id,
      role: member.role ?? "member",
      academicProfile: member.academicProfile ?? null,
      collaborationProfile: member.collaborationProfile ?? null,
    })),
    null,
    2,
  );
};

const buildDifficultyPrompt = (input: ProjectTaskAutomationInput): string => {
  const contextLines = [
    input.projectDescription
      ? `תיאור הפרויקט: ${input.projectDescription}`
      : null,
    input.projectInstructions
      ? `הנחיות הפרויקט: ${input.projectInstructions}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  return `אתה עוזר AI לניתוח פרויקטים אקדמיים לסטודנטים.
החזר אך ורק JSON תקני וללא markdown.

המטרה: להעריך עד כמה הפרויקט מורכב לביצוע, על סולם של 1 עד 10.

החזר בדיוק את המבנה הבא:
{
  "difficulty": 7
}

שם הפרויקט: ${input.projectName}
${contextLines ? `\n${contextLines}` : ""}

הנחיות:
- תן ציון שמרני של מורכבות אמיתית
- השתמש ב-1 לפרויקט פשוט מאוד ו-10 לפרויקט מורכב במיוחד
- אל תוסיף טקסט נוסף מחוץ ל-JSON`;
};

const buildTaskPrompt = (
  input: ProjectTaskAutomationInput,
  difficulty: number,
  taskCount: number,
): string => {
  const contextLines = [
    input.projectDescription
      ? `תיאור הפרויקט: ${input.projectDescription}`
      : null,
    input.projectInstructions
      ? `הנחיות הפרויקט: ${input.projectInstructions}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  const memberIdsBlock =
    input.projectMemberIds && input.projectMemberIds.length > 0
      ? JSON.stringify(input.projectMemberIds)
      : "[]";
  const memberProfilesBlock = buildMemberProfilesBlock(input);
  const finalSubmissionAt = formatDateForPrompt(input.finalSubmissionAt);
  const assignmentGuidance = `
Member profiles for assignment decisions:
${memberProfilesBlock}

Assignment and fairness rules:
- Use member skills, learning goals, availability and task preferences when choosing assignees.
- Difficulty workload ratio is easy:medium:hard = 1:2:3.
- Balance by weighted workload, not by raw task count.
- Try to spread hard, medium and easy tasks fairly across members.
- Avoid giving one member mostly hard tasks while another receives mostly easy tasks, unless the member profile clearly justifies it.
- Every task must still have exactly one assignee from the allowed member IDs.`;

  return `אתה עוזר AI ליצירת משימות לפרויקטים אקדמיים.
החזר אך ורק JSON תקני וללא markdown וללא טקסט נוסף.

המשימה: ליצור בדיוק ${taskCount} משימות התחלתיות לפרויקט.
הפרויקט הוערך ברמת קושי ${difficulty} מתוך 10.

כל אובייקט במערך חייב להיות במבנה הבא:
{
  "title": "כותרת קצרה בעברית",
  "description": "תיאור קצר וברור בעברית",
  "priority": "high|medium|low",
  "difficulty": "easy|medium|hard",
  "status": "todo",
  "assigneeIds": ["memberId1"],
  "dueDate": "YYYY-MM-DDTHH:mm:ss.sssZ או null",
  "completed": false
}

כל המשימות חייבות להיות פתוחות, כלומר status=todo ו-completed=false.
חלק את עומס העבודה בצורה שווה ככל האפשר בין חברי הצוות.
כל משימה צריכה להיות משויכת לחבר צוות אחד בלבד, כדי לשמור על חלוקה שווה.
השתמש רק במזהי חברי הצוות הבאים אם אתה משייך משימות: ${memberIdsBlock}

שם הפרויקט: ${input.projectName}
${contextLines ? `\n${contextLines}` : ""}
${assignmentGuidance}
${finalSubmissionAt ? `\nתאריך הגשה סופי: ${finalSubmissionAt}` : ""}

הנחיות:
- צור משימות שמתאימות ישירות להנחיות ולרעיון של הפרויקט
- פזר את המשימות כך שיכסו מחקר, תכנון, פיתוח, בדיקה והגשה לפי הצורך
- סדר את dueDate כך שהמשימות המוקדמות יהיו קרובות יותר להתחלה והמשימות האחרונות יגיעו עד תאריך ההגשה הסופי
- שמור על כותרות קצרות ותיאורים פרקטיים
- אל תוסיף משימות כפולות או כלליות מדי
- החזר בדיוק ${taskCount} אובייקטים במערך, לא יותר ולא פחות`;
};

export const estimateProjectTaskDifficulty = async (
  input: ProjectTaskAutomationInput,
): Promise<ProjectTaskDifficultyEstimate> => {
  const prompt = buildDifficultyPrompt(input);
  const result = await taskSuggestionModel.generateContent(prompt);
  const content = result.response.text();
  const parsed = JSON.parse(extractJsonObject(content));

  return validateDifficultyEstimate(parsed);
};

export const generateProjectTaskAutomation = async (
  input: ProjectTaskAutomationInput,
): Promise<ProjectTaskAutomationResult> => {
  const difficultyEstimate = await estimateProjectTaskDifficulty(input);
  const taskCount = getTaskCount(difficultyEstimate.difficulty);
  const prompt = buildTaskPrompt(
    input,
    difficultyEstimate.difficulty,
    taskCount,
  );
  const result = await taskSuggestionModel.generateContent(prompt);
  const content = result.response.text();
  const parsed = JSON.parse(extractJsonArray(content));
  const memberIds = Array.from(
    new Set(
      (input.projectMemberIds ?? [])
        .map((memberId) => memberId.trim())
        .filter(Boolean),
    ),
  );
  const scheduledTasks = balanceAssignees(
    distributeDueDates(
      validateProjectTaskList(parsed, memberIds, taskCount),
      input.finalSubmissionAt,
    ),
    memberIds,
  );

  return {
    difficulty: difficultyEstimate.difficulty,
    taskCount,
    tasks: scheduledTasks,
  };
};
