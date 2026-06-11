import type { Project } from "../../../types/common";
import type { Timestamp } from "firebase/firestore";
import type {
  TaskSuggestionResult,
  TaskSuggestionTaskSummary,
} from "./taskSuggestion.types";
import { taskSuggestionModel } from "@services/firebase/firebase";

const VALID_PRIORITIES = ["high", "medium", "low"] as const;
const VALID_DIFFICULTIES = ["easy", "medium", "hard"] as const;
const DATE_REGEX = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;

const normalizeDate = (value?: string | null | Timestamp): string | null => {
  if (!value) {
    return null;
  }

  const date =
    typeof value === "string"
      ? new Date(`${value}T00:00:00`)
      : value.toDate();

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const formatTaskSummary = (task: TaskSuggestionTaskSummary): string => {
  const dueDate = normalizeDate(task.dueDate);
  return `- ${task.title}${dueDate ? ` (עד ${dueDate})` : ""}`;
};

const buildProjectSummary = (project: Project): string => {
  const lines = [
    `שם הפרויקט: ${project.name}`,
    project.description ? `תיאור הפרויקט: ${project.description}` : null,
    project.projectType ? `סוג פרויקט: ${project.projectType}` : null,
    project.courseName ? `קורס: ${project.courseName}` : null,
    project.institutionName ? `מוסד: ${project.institutionName}` : null,
    project.lecturerName ? `מרצה: ${project.lecturerName}` : null,
    project.courseCode ? `קוד קורס: ${project.courseCode}` : null,
    project.semesterLabel ? `סמסטר: ${project.semesterLabel}` : null,
    project.groupNumber ? `מספר קבוצה: ${project.groupNumber}` : null,
    project.dueDate ? `מועד סיום פרויקט: ${normalizeDate(project.dueDate)}` : null,
    project.finalSubmissionAt ? `מועד הגשה סופית: ${normalizeDate(project.finalSubmissionAt)}` : null,
    project.nextMilestoneAt ? `מיילסטון הבא: ${normalizeDate(project.nextMilestoneAt)}` : null,
  ].filter(Boolean);

  return lines.join("\n");
};

const extractJsonObject = (text: string): string => {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) {
    return trimmed;
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("AI response did not contain valid JSON.");
  }

  return trimmed.slice(start, end + 1);
};

const isMeaningfulLine = (line: string): boolean => {
  const normalized = line.trim();
  if (normalized.length < 12) {
    return false;
  }

  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length < 3) {
    return false;
  }

  return /[א-ת]/.test(normalized) && /\S/.test(normalized);
};

const validateTaskSuggestion = (value: unknown): TaskSuggestionResult => {
  if (!value || typeof value !== "object") {
    throw new Error("AI response is not an object.");
  }

  const data = value as Record<string, unknown>;

  if (!Array.isArray(data.description) || data.description.length !== 3) {
    throw new Error("AI response description must be an array of exactly 3 lines.");
  }

  const description = data.description.map((item) =>
    typeof item === "string" ? item.trim() : "",
  ) as [string, string, string];

  if (description.some((line) => !isMeaningfulLine(line))) {
    throw new Error(
      "AI response description lines must be three meaningful Hebrew sentences or near-sentences.",
    );
  }

  if (!Array.isArray(data.suggestedApproach)) {
    throw new Error("AI response suggestedApproach must be an array.");
  }

  const suggestedApproach = data.suggestedApproach
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean) as string[];

  if (suggestedApproach.length < 1 || suggestedApproach.length > 2) {
    throw new Error("AI response suggestedApproach must contain 1 or 2 non-empty lines.");
  }

  if (suggestedApproach.some((line) => line.length < 8 || line.split(/\s+/).filter(Boolean).length < 2)) {
    throw new Error("AI response suggestedApproach lines must be meaningful short Hebrew phrases.");
  }

  const priority = data.priority;
  const difficulty = data.difficulty;
  const recommendedDueDate =
    typeof data.recommendedDueDate === "string"
      ? data.recommendedDueDate.trim()
      : "";
  const reason = typeof data.reason === "string" ? data.reason.trim() : "";

  if (!VALID_PRIORITIES.includes(priority as TaskSuggestionResult["priority"])) {
    throw new Error("AI response priority is invalid.");
  }

  if (!VALID_DIFFICULTIES.includes(difficulty as TaskSuggestionResult["difficulty"])) {
    throw new Error("AI response difficulty is invalid.");
  }

  if (!DATE_REGEX.test(recommendedDueDate)) {
    throw new Error("AI response recommendedDueDate must be YYYY-MM-DD.");
  }

  const parsedDate = new Date(`${recommendedDueDate}T00:00:00`);
  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error("AI response recommendedDueDate is invalid.");
  }

  if (!reason || reason.length < 8) {
    throw new Error("AI response reason must be a non-empty short Hebrew explanation.");
  }

  return {
    description,
    suggestedApproach:
      suggestedApproach.length === 1
        ? [suggestedApproach[0]]
        : [suggestedApproach[0], suggestedApproach[1]],
    priority: priority as TaskSuggestionResult["priority"],
    difficulty: difficulty as TaskSuggestionResult["difficulty"],
    recommendedDueDate,
    reason,
  };
};

const buildTaskListBlock = (
  title: string,
  tasks: TaskSuggestionTaskSummary[],
): string => {
  if (tasks.length === 0) {
    return `${title}: אין משימות.`;
  }

  return `${title}:\n${tasks
    .slice(0, 5)
    .map(formatTaskSummary)
    .join("\n")}`;
};

const buildPrompt = (
  project: Project,
  taskTitle: string,
  completedTasks: TaskSuggestionTaskSummary[],
  openTasks: TaskSuggestionTaskSummary[],
  inProgressTasks: TaskSuggestionTaskSummary[],
  projectDescription?: string | null,
  projectInstructions?: string | null,
): string => {
  const contextLines = [
    projectDescription ? `הקשר הפרויקט: ${projectDescription}` : null,
    projectInstructions ? `הנחיות הפרויקט: ${projectInstructions}` : null,
  ].filter(Boolean).join("\n");

  return `אתה עוזר תכנון משימות אקדמי.
השב אך ורק ב-JSON תקני בלבד, ללא markdown, ללא bullets, ללא הסברים נוספים וללא טקסט מעבר ל-JSON.

מבנה התשובה המדויק חייב להיות רק:
{
  "description": ["Hebrew task description line 1", "Hebrew task description line 2", "Hebrew task description line 3"],
  "suggestedApproach": ["Hebrew efficient solution/approach line 1", "Optional Hebrew efficient solution/approach line 2"],
  "priority": "high|medium|low",
  "difficulty": "easy|medium|hard",
  "recommendedDueDate": "YYYY-MM-DD",
  "reason": "short Hebrew explanation"
}

התיאור צריך לכלול בדיוק 3 שורות משמעותיות בעברית.
שורה 1: מהי המשימה.
שורה 2: מה צריך לבצע.
שורה 3: מה התוצר הצפוי.

הגישה המומלצת צריכה לכלול 1 או 2 שורות קצרות ופרקטיות.

${buildProjectSummary(project)}
${contextLines ? `\n${contextLines}` : ""}

${buildTaskListBlock("משימות הושלמו", completedTasks)}

${buildTaskListBlock("משימות פתוחות", openTasks)}

${buildTaskListBlock("משימות בתהליך עבודה", inProgressTasks)}


כותרת המשימה החדשה: ${taskTitle}

המלץ על תאריך יעד שאינו מאוחר מתאריך סיום הפרויקט אם קיים. אם אין תאריך סיום, בחר תאריך מתאים עד 14 יום קדימה.`;
};

export const generateTaskSuggestion = async (
  project: Project,
  taskTitle: string,
  completedTasks: TaskSuggestionTaskSummary[],
  openTasks: TaskSuggestionTaskSummary[],
  inProgressTasks: TaskSuggestionTaskSummary[],
  projectDescription?: string | null,
  projectInstructions?: string | null,
): Promise<TaskSuggestionResult> => {
  const prompt = buildPrompt(
    project,
    taskTitle,
    completedTasks,
    openTasks,
    inProgressTasks,
    projectDescription,
    projectInstructions,
  );

  const result = await taskSuggestionModel.generateContent(prompt);
  const content = result.response.text();
  const json = extractJsonObject(content);
  const parsed = JSON.parse(json);

  return validateTaskSuggestion(parsed);
};
