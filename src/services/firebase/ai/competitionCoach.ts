import { taskSuggestionModel } from "@services/firebase/firebase";
import type {
  CompetitionCoachInput,
  CompetitionCoachResult,
  CompetitionRecommendedTask,
} from "./competitionCoach.types";

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

const validateRecommendedTasks = (
  value: unknown,
): CompetitionRecommendedTask[] => {
  if (!Array.isArray(value)) {
    throw new Error("recommendedTasks must be an array.");
  }

  const tasks: CompetitionRecommendedTask[] = [];

  value.forEach((item) => {
    if (!item || typeof item !== "object" || tasks.length >= 3) {
      return;
    }

    const data = item as Record<string, unknown>;
    const title = isNonEmptyString(data.title) ? data.title.trim() : "";
    const reason = isNonEmptyString(data.reason) ? data.reason.trim() : "";

    if (!title || !reason) {
      return;
    }

    tasks.push({
      taskId: isNonEmptyString(data.taskId) ? data.taskId.trim() : undefined,
      title,
      reason,
    });
  });

  return tasks;
};

const validateCompetitionCoachResult = (
  value: unknown,
): CompetitionCoachResult => {
  if (!value || typeof value !== "object") {
    throw new Error("AI response is not an object.");
  }

  const data = value as Record<string, unknown>;
  const headline = isNonEmptyString(data.headline) ? data.headline.trim() : "";
  const leaderName = isNonEmptyString(data.leaderName)
    ? data.leaderName.trim()
    : "";
  const motivation = isNonEmptyString(data.motivation)
    ? data.motivation.trim()
    : "";
  const recommendedTasks = validateRecommendedTasks(data.recommendedTasks);

  if (!headline || !leaderName || !motivation || recommendedTasks.length === 0) {
    throw new Error("AI response is missing required text fields.");
  }

  if (!Array.isArray(data.strategy) || data.strategy.length !== 3) {
    throw new Error("strategy must include exactly 3 steps.");
  }

  const strategy = data.strategy.map((step) =>
    isNonEmptyString(step) ? step.trim() : "",
  ) as [string, string, string];

  if (strategy.some((step) => step.length < 6)) {
    throw new Error("strategy steps must be meaningful.");
  }

  return {
    headline,
    leaderName,
    scoreGap:
      typeof data.scoreGap === "number" || typeof data.scoreGap === "string"
        ? data.scoreGap
        : "לא זמין",
    recommendedTasks,
    strategy,
    motivation,
  };
};

const buildPrompt = (input: CompetitionCoachInput): string => {
  const openTasks = input.openTasks.slice(0, 12).map((task) => ({
    id: task.id,
    title: task.title,
    priority: task.priority,
    difficulty: task.difficulty,
    status: task.status,
    dueDate: task.dueDate ?? null,
    assignees: task.assigneeNames,
  }));

  const completedTasks = input.completedTasks.slice(0, 8).map((task) => ({
    title: task.title,
    difficulty: task.difficulty,
    assignees: task.assigneeNames,
  }));

  return `אתה מאמן תחרותי חכם באפליקציית ניהול משימות לסטודנטים.
השב אך ורק JSON תקני ללא markdown וללא טקסט נוסף.

המטרה: לתת למשתמש תוכנית קצרה ומעשית כדי לצמצם פער ולעקוף את מוביל הקבוצה.
אל תמציא משימות שלא קיימות. בחר משימות רק מתוך openTasks.

המשתמש הנוכחי:
${JSON.stringify(input.currentUser)}

המוביל הנוכחי:
${JSON.stringify(input.leader)}

פער ניקוד:
${input.scoreGap}

משימות פתוחות:
${JSON.stringify(openTasks)}

משימות שהושלמו לאחרונה:
${JSON.stringify(completedTasks)}

החזר בדיוק את המבנה הבא:
{
  "headline": "כותרת קצרה בעברית",
  "leaderName": "שם המוביל",
  "scoreGap": ${input.scoreGap},
  "recommendedTasks": [
    {
      "taskId": "id של משימה קיימת אם יש",
      "title": "שם המשימה",
      "reason": "סיבה קצרה בעברית למה המשימה משתלמת"
    }
  ],
  "strategy": [
    "צעד פעולה 1 בעברית",
    "צעד פעולה 2 בעברית",
    "צעד פעולה 3 בעברית"
  ],
  "motivation": "משפט מוטיבציה קצר בעברית"
}`;
};

export const generateCompetitionCoachPlan = async (
  input: CompetitionCoachInput,
): Promise<CompetitionCoachResult> => {
  const prompt = buildPrompt(input);
  const result = await taskSuggestionModel.generateContent(prompt);
  const content = result.response.text();
  const parsed = JSON.parse(extractJsonObject(content));

  return validateCompetitionCoachResult(parsed);
};
