import { taskSuggestionModel } from "../firebase";

const buildPrompt = (rawInstructions: string): string =>
  `אתה עוזר AI. קיבלת הנחיות פרויקט אקדמי. תפקידך לסכם אותן בצורה תמציתית.

הנחיות גולמיות:
${rawInstructions}

צור סיכום קצר (עד 500 תווים) בעברית שמכיל:
- דרישות עיקריות
- תוצרים נדרשים
- מועדי הגשה (אם צוינו)
- מגבלות חשובות

החזר רק את הסיכום, בלי כותרות או סימנים מיוחדים.`;

export const summarizeInstructions = async (
  rawInstructions: string,
): Promise<string> => {
  const trimmed = rawInstructions.trim();
  if (!trimmed || trimmed.length < 20) return trimmed;

  try {
    const result = await taskSuggestionModel.generateContent(buildPrompt(trimmed));
    const text = result.response.text().trim();
    return text.slice(0, 600);
  } catch (error) {
    console.error("Failed to summarize instructions", error);
    return trimmed.slice(0, 500);
  }
};
