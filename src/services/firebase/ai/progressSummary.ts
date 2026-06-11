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

  const progressPercent = typeof data.progressPercent === "number"
    ? Math.max(0, Math.min(100, Math.round(data.progressPercent)))
    : 0;

  return {
    headline,
    summaryLines: [summaryLines[0], summaryLines[1], summaryLines[2]],
    completedHighlights,
    nextFocus,
    motivation,
    progressPercent,
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

  const contextLines = [
    input.projectDescription ? `תיאור הפרויקט: ${input.projectDescription}` : null,
    input.projectInstructions ? `הנחיות הפרויקט: ${input.projectInstructions}` : null,
  ].filter(Boolean).join("\n");

  return `אתה עוזר AI באפליקציית ניהול פרויקטים לסטודנטים.
השב אך ורק JSON תקני ללא markdown וללא טקסט נוסף.

המטרה: להעריך את התקדמות הפרויקט ביחס למטרות הפרויקט, ולא רק לפי מספר משימות שהושלמו.
בדוק כמה מהיעדים, הדרישות וההנחיות של הפרויקט מכוסים על ידי המשימות שהושלמו.
אם יש תיאור או הנחיות לפרויקט, העריך אחוז כיסוי של היעדים. אם אין, התבסס על המשימות בלבד.
אל תמציא עובדות או משימות שלא קיימות.

פרויקט:
${JSON.stringify(input.project)}
${contextLines ? `\n${contextLines}` : ""}

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
    "שורה 1 שמסבירה כמה מיעדי הפרויקט הושגו עד כה",
    "שורה 2 שמסבירה אילו חלקים מרכזיים של הפרויקט טרם כוסו",
    "שורה 3 שמחברת בין העבודה שבוצעה לכיוון הסופי של הפרויקט"
  ],
  "completedHighlights": [
    "הישג או יעד שהושג לפי הנתונים"
  ],
  "nextFocus": "מה כדאי לבדוק או להמשיך ממנו עכשיו במשפט אחד",
  "motivation": "משפט קצר שמעודד את הקבוצה להמשיך",
  "progressPercent": 42
}

progressPercent הוא מספר בין 0 ל-100 שמייצג כמה אחוזים מהיעדים הכוללים של הפרויקט כבר הושגו.
חשוב מאוד: היה שמרני ומחמיר. פרויקט אקדמי כולל מחקר, כתיבה, עריכה, הגשה ועוד שלבים רבים. 3-5 משימות קטנות שהושלמו צריכות לתת 5-15% לכל היותר. רק פרויקט שכמעט כל הדרישות מכוסות צריך לקבל מעל 70%.`;
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