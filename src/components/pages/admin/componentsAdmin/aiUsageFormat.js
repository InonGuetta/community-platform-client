// How the AI cost panel words and rounds what the server reports (PRD ADM-1).
// Pure, so it is tested without rendering the dashboard.

// What each purpose is called on the screen. A purpose the server adds before
// this client knows it is shown under its own name rather than hidden: a cost
// nobody can see is the one thing this panel exists to prevent.
export const PURPOSE_LABELS = {
  transcription: "תמלול (Whisper)",
  summary: "סיכום ונקודות מפתח",
  embeddings: "אינדוקס לחיפוש",
  search: "חיפוש",
  chat: "דיון עם AI",
  hebrew_fix: "תיקון עברית",
  headings: "כותרות משנה",
  tagging: "הצעות תגיות",
};

export const purposeLabel = (purpose) => PURPOSE_LABELS[purpose] ?? purpose;

// Dollars to the cent — and "פחות מסנט" rather than "$0.00" for a purpose that
// did cost something: zero and almost-zero are different answers.
export const formatUsd = (value) => {
  const n = Number(value) || 0;
  if (n === 0) return "$0";
  if (n < 0.01) return "פחות מסנט";
  return `$${n.toFixed(2)}`;
};

// What a purpose USED, in its own unit: minutes of audio for Whisper, tokens
// for everything else — in thousands, because a single lecture is tens of
// thousands of them.
export const formatUsage = ({ audio_seconds: seconds = 0, input_tokens: input = 0, output_tokens: output = 0 }) => {
  if (seconds > 0) return `${Math.round(seconds / 60).toLocaleString("he-IL")} דקות שמע`;
  const thousands = (input + output) / 1000;
  return `${thousands < 10 ? thousands.toFixed(1) : Math.round(thousands).toLocaleString("he-IL")} אלף טוקנים`;
};

// How far through the cap, 0–100, and how worried to look about it. No cap:
// null, and the panel says how to set one instead of drawing a bar.
export const capProgress = (spent, cap) => {
  if (!cap) return null;
  const percent = Math.min(100, (Number(spent) / cap) * 100);
  return { percent, severity: percent >= 100 ? "error" : percent >= 80 ? "warning" : "primary" };
};
