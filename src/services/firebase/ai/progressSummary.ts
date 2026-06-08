import { taskSuggestionModel } from "@services/firebase/firebase";
import type {
  ProjectProgressSummaryInput,
  ProjectProgressSummaryResult,
} from "./progressSummary.types";

const extractJsonObject = (text: string): string => {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) {
    return trimmed;
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("AI response did not contain JSON.");
  }

  return trimmed.slice(start, end + 1);
};

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const validateStringList = (value: unknown, maxItems: number): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isNonEmptyString)
    .map((item) => item.trim())
    .filter((item) => item.length >= 4)
    .slice(0, maxItems);
};

const validateProjectProgressSummary = (
  value: unknown,
): ProjectProgressSummaryResult => {
  if (!value || typeof value !== "object") {
    throw new Error("AI response is not an object.");
  }

  const data = value as Record<string, unknown>;
  const headline = isNonEmptyString(data.headline) ? data.headline.trim() : "";
  const summaryLines = validateStringList(data.summaryLines, 3);
  const completedHighlights = validateStringList(data.completedHighlights, 4);
  const nextFocus = isNonEmptyString(data.nextFocus) ? data.nextFocus.trim() : "";
  const motivation = isNonEmptyString(data.motivation) ? data.motivation.trim() : "";

  if (
    !headline ||
    summaryLines.length !== 3 ||
    !nextFocus ||
    !motivation
  ) {
    throw new Error("AI response is missing required progress fields.");
  }

  return {
    headline,
    summaryLines: [summaryLines[0], summaryLines[1], summaryLines[2]],
    completedHighlights,
    nextFocus,
    motivation,
  };
};

const simplifyTask = (task: ProjectProgressSummaryInput["completedTasks"][number]) => ({
  title: task.title,
  priority: task.priority,
  difficulty: task.difficulty,
  status: task.status,
  dueDate: task.dueDate ?? null,
  assignees: task.assigneeNames,
});

const buildPrompt = (input: ProjectProgressSummaryInput): string => {
  const completedTasks = input.completedTasks.slice(0, 14).map(simplifyTask);
  const inProgressTasks = input.inProgressTasks.slice(0, 8).map(simplifyTask);
  const openTasks = input.openTasks.slice(0, 10).map(simplifyTask);

  return `אתה עוזר AI באפליקציית ניהול פרויקטים לסטודנטים.
השב אך ורק JSON תקני ללא markdown וללא טקסט נוסף.

המטרה: להסביר למשתמש בעברית מה נעשה בפרויקט עד כה, על סמך נתוני הפרויקט והמשימות בלבד.
אל תמציא עובדות או משימות שלא קיימות. אם אין מספיק משימות שהושלמו, אמור זאת בעדינות והתבסס על ההתקדמות הקיימת.

פרויקט:
${JSON.stringify(input.project)}

משימות שהושלמו:
${JSON.stringify(completedTasks)}

משימות בתהליך:
${JSON.stringify(inProgressTasks)}

משימות פתוחות:
${JSON.stringify(openTasks)}

החזר בדיוק את המבנה הבא:
{
  "headline": "כותרת קצרה בעברית",
  "summaryLines": [
    "שורה 1 שמסבירה מה נעשה עד כה",
    "שורה 2 שמסבירה את ההתקדמות",
    "שורה 3 שמחברת בין העבודה שבוצעה לכיוון הפרויקט"
  ],
  "completedHighlights": [
    "הישג או משימה שהושלמה לפי הנתונים"
  ],
  "nextFocus": "מה כדאי לבדוק או להמשיך ממנו עכשיו במשפט אחד",
  "motivation": "משפט קצר שמעודד את הקבוצה להמשיך"
}`;
};

export const generateProjectProgressSummary = async (
  input: ProjectProgressSummaryInput,
): Promise<ProjectProgressSummaryResult> => {
  const prompt = buildPrompt(input);
  const result = await taskSuggestionModel.generateContent(prompt);
  const content = result.response.text();
  const parsed = JSON.parse(extractJsonObject(content));

  return validateProjectProgressSummary(parsed);
};