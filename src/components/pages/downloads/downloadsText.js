import { defaultCreatorName } from "../../../utilities/constant";
import { formatTime } from "../../../utilities/formatTime";
import { formatDate } from "../../../utilities/formatDate";
import { formatBytes, percentOf } from "../../../utilities/offlineStore";
import i18n from "../../../i18n/i18n";

// The words on the downloads page (PRD MOB-2), kept apart from the layout so
// they can be tested without rendering it.

// "הרב כהן · גמרא" — the lecturer only when one was recorded ("כללי" means none).
export const lessonByline = (item) =>
  [
    item?.creator_name && item.creator_name !== defaultCreatorName ? item.creator_name : null,
    item?.course_title || null,
  ].filter(Boolean).join(" · ");

// "1:02:10 · 58 MB · נשמר 2 בנובמבר 2026", and says when a video was kept as
// its audio only, so nobody wonders where the picture went.
export const lessonDetails = (item) =>
  [
    item?.media_type === "video" ? i18n.t("downloads:audioFromVideo") : null,
    item?.duration_seconds > 0 ? formatTime(item.duration_seconds) : null,
    item?.size ? formatBytes(item.size) : null,
    item?.savedAt ? i18n.t("downloads:savedOn", { date: formatDate(item.savedAt) }) : null,
  ].filter(Boolean).join(" · ");

// "45%" when the size is known, "12 MB" so far when it is not.
export const progressLabel = ({ received, total }) => {
  const percent = percentOf(received, total);
  return percent === null ? i18n.t("downloads:soFar", { size: formatBytes(received) }) : `${percent}%`;
};

// "בשימוש 340 MB · פנויים כ-12 GB" — how much the saved lessons take, and how
// much more the browser says this site may use. The second half only where the
// browser answers.
export const storageLine = (totalSize, estimate) => {
  const used = i18n.t("downloads:storageUsed", { size: formatBytes(totalSize) });
  if (!estimate?.quota) return used;
  const free = Math.max(0, estimate.quota - estimate.usage);
  return i18n.t("downloads:storageFree", { used, free: formatBytes(free) });
};
