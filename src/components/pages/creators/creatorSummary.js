import { formatHebrewDate } from "../../../utilities/formatDate";

// The line under a lecturer's name (PRD ATTR-10), kept apart from the layout so
// it can be tested without rendering it:
// "12 שיעורים · 18 שעות הקלטה · אחרון: 1 בנובמבר 2026".

// What kinds they are, in words — only the kinds there are.
const kinds = (p) =>
  [
    p.video_count > 0 && (p.video_count === 1 ? "וידאו אחד" : `${p.video_count} וידאו`),
    p.audio_count > 0 && (p.audio_count === 1 ? "הקלטת שמע אחת" : `${p.audio_count} הקלטות שמע`),
    p.text_count > 0 && (p.text_count === 1 ? "ספר אחד" : `${p.text_count} ספרים`),
  ].filter(Boolean);

// Hours from an hour up, minutes below; nothing when nothing was measured.
export const recordedLength = (seconds) => {
  if (!(seconds > 0)) return null;
  const hours = seconds / 3600;
  if (hours >= 1) {
    const rounded = Math.round(hours * 10) / 10;
    return rounded === 1 ? "שעת הקלטה אחת" : `${rounded} שעות הקלטה`;
  }
  const minutes = Math.max(1, Math.round(seconds / 60));
  return minutes === 1 ? "דקת הקלטה אחת" : `${minutes} דקות הקלטה`;
};

export const creatorSummary = (p) => {
  if (!p) return "";
  const total = p.media_count === 1 ? "פריט אחד" : `${p.media_count} פריטים`;
  const parts = [total];
  const byKind = kinds(p);
  if (byKind.length > 1) parts[0] = `${total} (${byKind.join(", ")})`;
  else if (byKind.length === 1) parts[0] = byKind[0];
  const length = recordedLength(p.total_seconds);
  if (length) parts.push(length);
  const latest = formatHebrewDate(p.latest_at);
  if (latest) parts.push(`אחרון: ${latest}`);
  return parts.join(" · ");
};
