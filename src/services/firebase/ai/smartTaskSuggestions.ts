import { taskSuggestionModel } from "@services/firebase/firebase";
import type { SmartTaskSuggestionsInput, SmartTaskSuggestionsResult, SmartTaskSuggestion } from "./smartTaskSuggestions.types";

const VALID_PRIORITIES = ["high", "medium", "low"] as const;
const VALID_DIFFICULTIES = ["easy", "medium", "hard"] as const;

const extractJsonArray = (text: string): string => {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("AI response did not contain valid JSON array.");
  }
  return text.slice(start, end + 1);
};

const validateSuggestion = (item: unknown, validMemberIds: string[]): SmartTaskSuggestion => {
  const data = item as Record<string, unknown>;
  if (!data || typeof data !== "object") throw new Error("Invalid suggestion item");

  const title = typeof data.title === "string" ? data.title.trim() : "";
  const description = typeof data.description === "string" ? data.description.trim() : "";
  const priority = data.priority as string;
  const difficulty = data.difficulty as string;
  const suggestedAssigneeId = typeof data.suggestedAssigneeId === "string" ? data.suggestedAssigneeId : validMemberIds[0] ?? "";
  const reason = typeof data.reason === "string" ? data.reason.trim() : "";

  if (!title || !description || !reason) throw new Error("Missing required fields in suggestion");
  if (!VALID_PRIORITIES.includes(priority as typeof VALID_PRIORITIES[number])) throw new Error("Invalid priority");
  if (!VALID_DIFFICULTIES.includes(difficulty as typeof VALID_DIFFICULTIES[number])) throw new Error("Invalid difficulty");

  return {
    title,
    description,
    priority: priority as SmartTaskSuggestion["priority"],
    difficulty: difficulty as SmartTaskSuggestion["difficulty"],
    suggestedAssigneeId: validMemberIds.includes(suggestedAssigneeId) ? suggestedAssigneeId : validMemberIds[0] ?? "",
    reason,
  };
};

const buildPrompt = (input: SmartTaskSuggestionsInput): string => {
  const tasksList = input.existingTasks.length
    ? input.existingTasks.slice(0, 10).map(t => `- ${t.title} (${t.status})`).join("\n")
    : "אין משימות קיימות.";

  const deadlinesList = input.deadlines.length
    ? input.deadlines.map(d => `- ${d.label}: ${d.date}`).join("\n")
    : "אין דדליינים.";

  const membersList = input.memberScores
    .map(m => `- ${m.name} (id: ${m.id}, ניקוד: ${m.score})`)
    .join("\n");

  return `אתה עוזר תכנון משימות אקדמי. נתח את הפרויקט והצע 3 משימות חדשות שחסרות.
השב אך ורק ב-JSON תקני בלבד - מערך של 3 אובייקטים, ללא markdown וללא טקסט נוסף.

מבנה כל אובייקט:
{"title":"כותרת בעברית","description":"תיאור קצר בעברית","priority":"high|medium|low","difficulty":"easy|medium|hard","suggestedAssigneeId":"member_id","reason":"סיבה קצרה בעברית"}

שם הפרויקט: ${input.projectName}
${input.projectDescription ? `תיאור: ${input.projectDescription}` : ""}

משימות קיימות:
${tasksList}

דדליינים:
${deadlinesList}

חברי צוות (מי שיש לו ניקוד נמוך יותר - עשה פחות עבודה):
${membersList}

הנחיות:
- הצע משימות שחסרות לפי מטרות הפרויקט
- שייך משימות לחברים עם ניקוד נמוך יותר כדי לאזן עומסים
- תן עדיפויות וקשיים מגוונים`;
};

export const generateSmartTaskSuggestions = async (
  input: SmartTaskSuggestionsInput,
): Promise<SmartTaskSuggestionsResult> => {
  const prompt = buildPrompt(input);
  const result = await taskSuggestionModel.generateContent(prompt);
  const content = result.response.text();
  const parsed = JSON.parse(extractJsonArray(content));

  if (!Array.isArray(parsed) || parsed.length < 3) {
    throw new Error("AI must return exactly 3 suggestions.");
  }

  const memberIds = input.memberScores.map(m => m.id);
  return [
    validateSuggestion(parsed[0], memberIds),
    validateSuggestion(parsed[1], memberIds),
    validateSuggestion(parsed[2], memberIds),
  ];
};
