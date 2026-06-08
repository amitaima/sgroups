import { taskSuggestionModel } from "@services/firebase/firebase";
import type {
  UserActivitySummaryInput,
  UserActivitySummaryResult,
} from "./userActivitySummary.types";

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

const validateUserActivitySummary = (
  value: unknown,
): UserActivitySummaryResult => {
  if (!value || typeof value !== "object") {
    throw new Error("AI response is not an object.");
  }

  const data = value as Record<string, unknown>;
  const headline = isNonEmptyString(data.headline) ? data.headline.trim() : "";
  const summaryLines = validateStringList(data.summaryLines, 3);
  const highlights = validateStringList(data.highlights, 5);
  const nextFocus = isNonEmptyString(data.nextFocus) ? data.nextFocus.trim() : "";

  if (!headline || summaryLines.length === 0 || !nextFocus) {
    throw new Error("AI response is missing required activity fields.");
  }

  return {
    headline,
    summaryLines,
    highlights,
    nextFocus,
  };
};

const buildPrompt = (input: UserActivitySummaryInput): string => {
  const completedTasks = input.completedTasks ?? [];
  const recentTasks = input.recentTasks ?? [];
  const isPersonalRecentWorkSummary = recentTasks.length > 0;
  const isPersonalCompletionSummary = !isPersonalRecentWorkSummary && completedTasks.length > 0;

  const goal = isPersonalRecentWorkSummary
    ? "Write a short Hebrew message in bullet points that the current user can send to the team about the latest work they personally did on the task board."
    : isPersonalCompletionSummary
      ? "Write a short Hebrew message in bullet points that the current user can send to the team about tasks they personally completed since the previous login."
      : "Write a short Hebrew progress summary of the latest project activity for the user.";

  return `You are an AI assistant inside a student project-management app.
Return only valid JSON. Do not return markdown or any extra text.

Goal: ${goal}

Output rules:
- Write natural, clear, professional Hebrew.
- The visible message must contain only task bullets from the provided activity data.
- Each summaryLines item must describe one concrete task/action the user did in the latest login window.
- Use the task description field when it exists, but keep it short and do not copy long text.
- Do not add general project progress, recommendations, encouragement, priorities, or future focus to summaryLines.
- Do not invent actions, tasks, projects, dates, owners, or results that are not present in the data.
- If recentTasks is not empty, focus on recentTasks only and describe what the current user actually worked on.
- If recentTasks is empty but completedTasks is not empty, focus only on completedTasks.
- If there is not enough meaningful data, return exactly one summaryLines item: "?? ??? ??????? ???????".
- Return one to three summaryLines items. Use bullet-style wording, but do not include the bullet character itself.
- Keep highlights as an empty array.
- Keep nextFocus short because it is kept only for data compatibility and is not shown in the message.

User name: ${input.userName}
Previous login: ${input.previousLoginAt}
Current login: ${input.currentLoginAt}

Recent task-board work by the current user:
${JSON.stringify(recentTasks.slice(0, 8))}

Completed tasks by the current user:
${JSON.stringify(completedTasks.slice(0, 12))}

Updated projects:
${JSON.stringify(input.updatedProjects.slice(0, 8))}

Tasks created by the current user since previous login:
${JSON.stringify(input.createdTasks.slice(0, 10))}

Updated tasks related to the current user:
${JSON.stringify(input.updatedTasks.slice(0, 14))}

Return this exact JSON shape:
{
  "headline": "A short Hebrew title",
  "summaryLines": [
    "Hebrew bullet line with task title and a short detail from description when available"
  ],
  "highlights": [],
  "nextFocus": "Compatibility field only"
};`;
};

export const generateUserActivitySummary = async (
  input: UserActivitySummaryInput,
): Promise<UserActivitySummaryResult> => {
  const result = await taskSuggestionModel.generateContent(buildPrompt(input));
  const content = result.response.text();
  const parsed = JSON.parse(extractJsonObject(content));

  return validateUserActivitySummary(parsed);
};
