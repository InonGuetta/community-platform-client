import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import ButtonBase from "@mui/material/ButtonBase";
import CircularProgress from "@mui/material/CircularProgress";
import SectionCard from "../../../features/SectionCard/SectionCard";
import { statuses, mediaTypeLabels } from "../../../../utilities/constant";
import { BOOKMARK_DRAG_MIME, bookmarkDragPayload } from "../../../../utilities/noteSource";
import { placeLabel, placeShortLabel, bookmarkLines } from "../../../../utilities/bookmarks";
import { RADIUS, MOTION, TYPE_ACCENT } from "../../../../theme/tokens";
import { useTranslation } from "react-i18next";
import { useDirection } from "../../../../i18n/useDirection";

// "הסימניות שלי": every bookmark the user has, in one section per kind of
// content (recordings blue, videos orange, books purple — TYPE_ACCENT), the
// section with the most marks first (bookmarkSectionsByType), and inside a
// section grouped by lesson. A chip opens
// its source in the floating window, and is dragged into a note to become a
// source chip. Layout only — the values and openSource are
// useNotebookPageController's.
//
// Redesign v4 (screen 05): its own card under the index — a display heading
// with the count at its end; per section a bar in the type's colour with its
// name and count; per lesson its name, and then one chip per bookmark in the
// type's soft tint, carrying its place. The place is
// placeShortLabel — a time for a recording, a page (or "in the text") for a
// book — never the "0:00" formatTime(null) would print for a sefer.
const accentOf = (type, theme) => TYPE_ACCENT[type][theme.palette.mode === "dark" ? "dark" : "light"];

const BookmarksSidebar = ({
  bookmarkSections,
  bookmarks,
  bookmarksStatus,
  openSource,
}) => {
  "use no memo"; // reads i18next outside useTranslation's t while rendering: compiled, it would keep the old language
  const { t } = useTranslation("notebook");
  // The hook points toward the notes beside the list: left in Hebrew, right in English.
  const { rtl } = useDirection();
  return (
  <SectionCard>
    <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 2, mb: bookmarks.length > 0 ? 1 : 2.5 }}>
      <Typography variant="display" component="h2" sx={{ fontSize: 22 }}>{t("bookmarks.title")}</Typography>
      {bookmarks.length > 0 && (
        <Typography component="span" sx={{ fontSize: 14, color: "text.secondary" }}>{bookmarks.length}</Typography>
      )}
    </Box>
    {/* The one thing about this list that is not visible from looking at it.
        Shown under the heading rather than as a tooltip on the chips, because
        a feature nobody hovers over is a feature nobody finds. */}
    {bookmarks.length > 0 && (
      <Typography sx={{ fontSize: 13, color: "text.secondary", mb: 2.5 }}>
        {t("bookmarks.dragHint")} {rtl ? "↩" : "↪"}
      </Typography>
    )}

    {bookmarksStatus === statuses.loading && bookmarks.length === 0 ? (
      <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}><CircularProgress size={22} /></Box>
    ) : bookmarkSections.length === 0 ? (
      <Typography sx={{ fontSize: 15, color: "text.secondary" }}>
        {bookmarks.length === 0
          ? t("bookmarks.none")
          : t("bookmarks.noMatch")}
      </Typography>
    ) : (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3.5 }}>
        {bookmarkSections.map((section) => (
          <Box key={section.type} component="section" aria-label={mediaTypeLabels[section.type]}>
            <Box
              sx={(theme) => ({
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1,
                px: 1.5, py: 0.75, mb: 2,
                borderRadius: `${RADIUS.cover}px`,
                bgcolor: accentOf(section.type, theme).main,
                color: accentOf(section.type, theme).contrastText,
              })}
            >
              <Typography component="h3" sx={{ fontSize: 14, fontWeight: 800 }}>
                {mediaTypeLabels[section.type]}
              </Typography>
              <Typography component="span" sx={{ fontSize: 13, fontWeight: 700 }}>{section.count}</Typography>
            </Box>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
              {section.groups.map((group) => (
                <Box key={group.mediaId}>
                  {/* Wrapped rather than cut off. A lecture's real name is longer
                      than this column is wide, and an ellipsis in the heading that
                      says WHICH lecture these bookmarks belong to defeats the
                      grouping. overflowWrap covers a title with no spaces in it. */}
                  <Typography sx={{ fontSize: 15, fontWeight: 700, lineHeight: 1.35, mb: 1.5, overflowWrap: "anywhere" }}>
                    {group.mediaTitle}
                  </Typography>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                    {group.items.map((bm) => {
                      const note = String(bm.note ?? "").trim();
                      return (
                        <ButtonBase
                          key={bm.id}
                          onClick={() => openSource({
                            mediaId: group.mediaId,
                            timestampSeconds: bm.timestamp_seconds,
                            // The book half. Without it the window opened the sefer
                            // at its first paragraph — second zero of a thing with
                            // no seconds — however far in the bookmark pointed.
                            chunkId: bm.chunk_id ?? null,
                            // The third kind's half of the anchor. Without it two
                            // marks on different pages of one sefer are one entry in
                            // the trail, and the window opens on whichever was
                            // looked at last.
                            pageNumber: bm.page_number ?? null,
                            mediaTitle: group.mediaTitle,
                            // The note alone. What the OCR made of the page is not
                            // something to print in a window header — see
                            // bookmarkLines in utilities/bookmarks.js.
                            noteText: bm.note,
                          })}
                          // Dragged into a note, where it becomes a source chip — an
                          // inline reference that reopens the lecture at this place.
                          // The payload is the bookmark, not the markup: what a chip
                          // is made of belongs to utilities/noteSource.js.
                          draggable
                          onDragStart={(event) => {
                            event.dataTransfer.setData(
                              BOOKMARK_DRAG_MIME,
                              JSON.stringify(bookmarkDragPayload(bm, group.mediaTitle))
                            );
                            event.dataTransfer.effectAllowed = "copy";
                          }}
                          // The whole place in words for a screen reader ("בזמן
                          // 12:34", "עמ׳ 9") and the note; the full title a hover
                          // away, since a long note is cut short on the chip.
                          aria-label={note ? `${placeLabel(bm)} · ${note}` : placeLabel(bm)}
                          title={bookmarkLines(bm).title}
                          sx={{
                            height: 32, px: 1.5, gap: 0.75, maxWidth: "100%",
                            borderRadius: `${RADIUS.pill}px`,
                            bgcolor: (theme) => accentOf(section.type, theme).soft,
                            border: "1px solid",
                            borderColor: (theme) => accentOf(section.type, theme).soft,
                            fontSize: 13, fontWeight: 600, color: "text.primary",
                            cursor: "grab",
                            transition: "border-color .2s, transform .1s",
                            "&:hover": { borderColor: (theme) => accentOf(section.type, theme).main },
                            "&:active": { cursor: "grabbing", transform: MOTION.press },
                          }}
                        >
                          {/* dir="auto": a time is laid out left to right, "עמ׳ 9"
                              in the direction of its own words. */}
                          <Box component="span" dir="auto" sx={{ flexShrink: 0 }}>{placeShortLabel(bm)}</Box>
                          {/* What the user wrote, when they wrote something — the
                              chip is how a bookmark is told apart from its
                              neighbours, and the place alone may not say enough. */}
                          {note && (
                            <Box
                              component="span"
                              sx={{
                                fontWeight: 500, color: "text.secondary", minWidth: 0,
                                maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                              }}
                            >
                              {note}
                            </Box>
                          )}
                        </ButtonBase>
                      );
                    })}
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        ))}
      </Box>
    )}
  </SectionCard>
  );
};

export default BookmarksSidebar;
