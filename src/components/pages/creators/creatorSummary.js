import { formatDate } from "../../../utilities/formatDate";
import i18n from "../../../i18n/i18n";

// The line under a lecturer's name (PRD ATTR-10), kept apart from the layout so
// it can be tested without rendering it:
// "12 שיעורים · 18 שעות הקלטה · אחרון: 1 בנובמבר 2026".

// What kinds they are, in words — only the kinds there are.
const kinds = (p) =>
  [
    p.video_count > 0 && i18n.t("creators:video", { count: p.video_count }),
    p.audio_count > 0 && i18n.t("creators:audio", { count: p.audio_count }),
    p.text_count > 0 && i18n.t("creators:text", { count: p.text_count }),
  ].filter(Boolean);

// Hours from an hour up, minutes below; nothing when nothing was measured.
export const recordedLength = (seconds) => {
  if (!(seconds > 0)) return null;
  const hours = seconds / 3600;
  if (hours >= 1) {
    const rounded = Math.round(hours * 10) / 10;
    return i18n.t("creators:hours", { count: rounded });
  }
  const minutes = Math.max(1, Math.round(seconds / 60));
  return i18n.t("creators:minutes", { count: minutes });
};

export const creatorSummary = (p) => {
  if (!p) return "";
  const total = i18n.t("creators:items", { count: p.media_count });
  const parts = [total];
  const byKind = kinds(p);
  if (byKind.length > 1) parts[0] = `${total} (${byKind.join(", ")})`;
  else if (byKind.length === 1) parts[0] = byKind[0];
  const length = recordedLength(p.total_seconds);
  if (length) parts.push(length);
  const latest = formatDate(p.latest_at);
  if (latest) parts.push(i18n.t("creators:latest", { date: latest }));
  return parts.join(" · ");
};
