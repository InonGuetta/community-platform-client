import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import CircularProgress from "@mui/material/CircularProgress";
import { iconForBookmark } from "../../../../utilities/mediaIcons";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import { statuses, mediaTypeLabels, mediaTypeAccents, listRowSx } from "../../../../utilities/constant";
import { BOOKMARK_DRAG_MIME, bookmarkDragPayload } from "../../../../utilities/noteSource";
import { placeShortLabel, bookmarkLines } from "../../../../utilities/bookmarks";

// "הסימניות שלי" under the index: every bookmark the user has, grouped by
// lesson. A row opens its source in the floating window, and is dragged into
// a note to become a source chip. Layout only — the values and openSource are
// useNotebookPageController's.
const BookmarksSidebar = ({
  bookmarkGroups,
  bookmarks,
  bookmarksStatus,
  openSource,
}) => (
  <>
    <Divider />
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1, maxHeight: "45%", minHeight: 120 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <BookmarkIcon fontSize="small" color="primary" sx={{ flexShrink: 0 }} />
        <Typography variant="subtitle2" fontWeight={700} sx={{ flexShrink: 0 }}>הסימניות שלי</Typography>
        {bookmarks.length > 0 && (
          <Chip size="small" label={bookmarks.length} sx={{ height: 18, fontSize: "0.65rem", flexShrink: 0 }} />
        )}
        {/* The one thing about this list that is not visible from looking
            at it. Shown next to the count rather than as a tooltip on the
            rows, because a feature nobody hovers over is a feature nobody
            finds — and it is the ONLY thing here allowed to be squeezed
            out, because the heading and the count are what the panel is. */}
        {bookmarks.length > 0 && (
          <Typography variant="caption" color="text.secondary" noWrap sx={{ ml: "auto", minWidth: 0 }}>
            גרור אל תוך הערה ↩
          </Typography>
        )}
      </Box>

      {bookmarksStatus === statuses.loading && bookmarks.length === 0 ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}><CircularProgress size={22} /></Box>
      ) : bookmarkGroups.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 3 }}>
          {bookmarks.length === 0
            ? "עדיין אין סימניות. סמן נקודות בשיעורים והן יופיעו כאן."
            : "לא נמצאו סימניות תואמות."}
        </Typography>
      ) : (
        <Box sx={{ overflowY: "auto" }}>
          {bookmarkGroups.map((group) => (
            <Box key={group.mediaId} sx={{ mb: 1.5 }}>
              {/* "וידאו | כותרת השיעור", on the same accent the archive
                  card uses for that type, so a bookmark is recognisable
                  as video / audio / text at a glance. */}
              <Box
                sx={{
                  display: "flex", alignItems: "center", gap: 0.75,
                  px: 1, py: 0.5, mb: 0.5, borderRadius: 1.5,
                  bgcolor: mediaTypeAccents[group.mediaType] || "grey.600",
                  color: "#fff",
                }}
                title={group.mediaTitle}
              >
                <Typography variant="caption" fontWeight={800} sx={{ flexShrink: 0 }}>
                  {mediaTypeLabels[group.mediaType] || "שיעור"}
                </Typography>
                <Box sx={{ width: "1px", alignSelf: "stretch", bgcolor: "rgba(255,255,255,0.55)", flexShrink: 0 }} />
                {/* Wrapped rather than cut off. A lecture's real name is
                    longer than this column is wide, and an ellipsis in
                    the heading that says WHICH lecture these bookmarks
                    belong to defeats the grouping. overflowWrap covers
                    the case wrapping alone cannot: a title with no spaces
                    in it, which would otherwise push the coloured bar out
                    past the edge of the panel. */}
                <Typography variant="caption" fontWeight={700} sx={{ minWidth: 0, lineHeight: 1.3, overflowWrap: "anywhere" }}>
                  {group.mediaTitle}
                </Typography>
              </Box>
              <List dense disablePadding>
                {group.items.map((bm) => (
                  <ListItemButton
                    key={bm.id}
                    onClick={() => openSource({
                      mediaId: group.mediaId,
                      timestampSeconds: bm.timestamp_seconds,
                      // The book half. Without it the window opened the
                      // sefer at its first paragraph — second zero of a
                      // thing with no seconds — however far in the
                      // bookmark actually pointed.
                      chunkId: bm.chunk_id ?? null,
                      // The third kind's half of the anchor. Without it two
                      // marks on different pages of one sefer are one entry
                      // in the trail, and the window opens on whichever was
                      // looked at last.
                      pageNumber: bm.page_number ?? null,
                      mediaTitle: group.mediaTitle,
                      // The note alone. What the OCR made of the page is
                      // not something to print in a window header — see
                      // bookmarkLines in utilities/bookmarks.js.
                      noteText: bm.note,
                    })}
                    // Dragged into a note, where it becomes a source chip
                    // — an inline reference that reopens the lecture at
                    // this second. The payload is the bookmark, not the
                    // markup: what a chip is made of belongs to
                    // utilities/noteSource.js, and the sidebar should not
                    // have to know.
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData(
                        BOOKMARK_DRAG_MIME,
                        JSON.stringify(bookmarkDragPayload(bm, group.mediaTitle))
                      );
                      event.dataTransfer.effectAllowed = "copy";
                    }}
                    sx={{
                      display: "flex", alignItems: "center", gap: 1,
                      borderRadius: 2, mb: 0.5,
                      cursor: "grab",
                      "&:active": { cursor: "grabbing" },
                      ...listRowSx,
                    }}
                  >
                    {/* A book does not play, and a filmed shiur is not a
                        recorded one. Same size and colour, so the list
                        still reads as one list — see utilities/mediaIcons. */}
                    {(() => {
                      const Icon = iconForBookmark(bm);
                      return <Icon fontSize="small" sx={{ color: "primary.main", flexShrink: 0 }} />;
                    })()}
                    {/* One line per bookmark keeps the list scannable,
                        but the full text is a hover away — the row is
                        also what gets dragged into a note, so knowing
                        which one it is matters. */}
                    {/* The place stands in when nothing was written. It
                        used to be the marked words, which in this archive
                        are the OCR's reading of a photographed page and
                        are frequently wrong — see bookmarkLines. */}
                    <Typography
                      variant="body2"
                      noWrap
                      title={bookmarkLines(bm).title}
                      sx={{ flexGrow: 1, minWidth: 0 }}
                    >
                      {bookmarkLines(bm).title}
                    </Typography>
                    <Chip
                      size="small"
                      // formatTime(null) is "0:00", so every bookmark in
                      // every sefer wore a timestamp it does not have.
                      label={placeShortLabel(bm)}
                      sx={{ height: 18, fontSize: "0.65rem", flexShrink: 0 }}
                    />
                  </ListItemButton>
                ))}
              </List>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  </>
);

export default BookmarksSidebar;
