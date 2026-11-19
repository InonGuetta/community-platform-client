import { useRef, useCallback } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";
import MediaPlayer from "../../features/MediaPlayer/MediaPlayer";
import CoverArt from "../../features/MediaTile/CoverArt";
import TextViewer from "./componentsMediaView/TextViewer";
import { mediaApi } from "../../../api/mediaApi";
import LessonHeader from "./componentsMediaView/LessonHeader";
import MediaInsightsTabs from "./componentsMediaView/MediaInsightsTabs";
import NotesPanel from "./componentsMediaView/NotesPanel";
import MediaActionsBar from "./componentsMediaView/MediaActionsBar";
import LessonNotebook from "./componentsMediaView/LessonNotebook";
import AIDiscussionPanel from "./componentsMediaView/AIDiscussion/AIDiscussionPanel";
import CourseTrackBar from "./componentsMediaView/CourseTrackBar";
import AiTagSuggestions from "./componentsMediaView/AiTagSuggestions";
import SessionChatPanel from "./componentsMediaView/SessionChatPanel";
import useMediaViewPageController from "./useMediaViewPageController";
import { formatDate } from "../../../utilities/formatDate";
import { mediaTypes } from "../../../utilities/constant";
import { HEADER_HEIGHT } from "../../layout/shellGeometry";
import { RADIUS, SHADOW } from "../../../theme/tokens";
import { useTranslation } from "react-i18next";

// Presentation only. Everything that dispatches, selects or derives from server
// data lives in useMediaViewPageController — see its header for where that line
// is drawn and why this file used to sit on the wrong side of it.
//
// Redesign v4 (screens 20 and 26; the book, 27, is stage 4ב): the lesson's
// header, then a 12-column grid —
//
//   audio  5 = the cover art, square, with the player card under it
//          7 = the tabs card
//   video  7 = the player (radius 28, the heavy shadow) and its upload date
//          5 = the tabs card
//
// — and under the grid the meta line, the description and the lesson's own
// notebook. The columns stack on a phone: audio from md (as its mockup), video
// and books from lg, where five columns are still wide enough for the tabs.
//
// The tabs card no longer takes its height from the player (D-22): its panel
// area stops at 70vh and scrolls inside, so a long transcript keeps the line
// being played in view without moving the page. The actions row under the
// panel — like, save, download, share, and the overlays they open — is
// MediaActionsBar, shared with the notebook's source preview so the two cannot
// drift apart.

// A CSS grid, not MUI's Grid (D-45): its negative margins land on the wrong
// side without a stylis flip.
const columns = (bp) => ({ xs: "minmax(0, 1fr)", [bp]: "repeat(12, minmax(0, 1fr))" });

// Where the date line sits, in each layout: under the player of a video or a
// book (13px), or in the meta line under the grid for audio (14px), as drawn.
const dateSx = { color: "text.secondary", textAlign: "start" };

// The player or the reader, when a jump scrolls it to the top: clear of the
// sticky header.
const scrollTargetSx = { scrollMarginTop: `${HEADER_HEIGHT + 16}px` };

const MediaViewPage = () => {
  const { t } = useTranslation("lesson");
  const controller = useMediaViewPageController();
  const {
    media, bookmarks, transcript, showStatusBadge,
    handleCreateTextBookmark, readerTarget, jumpToBookmark,
    readerPage, handleReaderPageChange,
    seekOnReady, currentTime, handlePlayerProgress,
    handleCreateBookmark,
    isLiked, toggleLike,
    isSaved, toggleSave,
    isText,
    captions,
    handlePlayerEnded, courseTrack, refreshMedia,
    canEditTranscript,
  } = controller;

  // Stays here rather than in the controller: a ref has to be created in the
  // component that renders the element it points at.
  const playerRef = useRef(null);
  // What a jump from below the fold brings back into view: the player, or the
  // reader of a book.
  const mediaBoxRef = useRef(null);

  // Used by Chapters and Notes to jump the player to a specific timestamp
  // from a sibling component.
  const seekPlayer = useCallback((seconds) => {
    playerRef.current?.seekTo(seconds);
  }, []);

  // A source chip in the lesson notebook below points at this lesson. The
  // notebook sits under the fold, so moving the player without bringing it back
  // into view would be a jump the user cannot see.
  const revealMedia = () => mediaBoxRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  const seekFromNotebook = (seconds) => {
    seekPlayer(seconds);
    revealMedia();
  };
  const jumpFromNotebook = (bookmark) => {
    if (bookmark) jumpToBookmark(bookmark);
    revealMedia();
  };

  // A search hit or a citation on a page of a book. Expressed as a bookmark
  // that names a page and nothing finer — the shape the reader already resolves
  // for `?page=` links — so there is no second way to turn the reader. A fresh
  // object each time, so clicking the same page twice turns back to it after
  // the reader has been scrolled away.
  //
  // Both this and the seek reveal the media: on a phone the tab sits under the
  // player, and a jump the user cannot see looks like a click that did nothing.
  const openPageFromDiscussion = (page) => jumpFromNotebook({ page_number: page });

  if (!media) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  const isAudio = !isText && media.media_type === mediaTypes.audio;
  const bp = isAudio ? "md" : "lg";

  // The upload's date — media_items keeps no separate publication date. A draft
  // says so rather than claiming to be published, since the people who can see
  // one are exactly the people who know it is not.
  const date = formatDate(media.created_at);
  const dateLine = (sx) => date && (
    <Typography data-testid="media-date" sx={{ ...dateSx, ...sx }}>
      {media.is_published === false ? t("draftUploaded") : t("published")}
      {date}
    </Typography>
  );


  const player = (
    <MediaPlayer
      ref={playerRef}
      url={mediaApi.streamUrl(media.id)}
      media={media}
      // Only so the player's settings menu can offer the transcript
      // PDF without fetching one it already has.
      transcript={transcript}
      // Captions (PRD MOB-5): the same cues the transcript tab follows the
      // lesson with.
      captions={captions}
      onProgress={handlePlayerProgress}
      onEnded={handlePlayerEnded}
      seekOnReady={seekOnReady}
    />
  );

  return (
    <>
      <LessonHeader media={media} showStatusBadge={showStatusBadge} />

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: columns(bp),
          gap: 4,
          alignItems: "start",
        }}
      >
        <Box sx={{ gridColumn: { [bp]: isAudio ? "span 5" : "span 7" }, minWidth: 0 }}>
          {isAudio ? (
            <>
              {/* The lesson's cover — the archive tile's art, at the size of
                  the column (part B: the item wrap, radius 10, its shadow). */}
              <Box
                sx={{
                  position: "relative",
                  aspectRatio: "1 / 1",
                  borderRadius: `${RADIUS.cover}px`,
                  overflow: "hidden",
                  boxShadow: SHADOW.cover,
                }}
              >
                <CoverArt item={media} />
              </Box>
              <Box ref={mediaBoxRef} sx={{ mt: 2.5, ...scrollTargetSx }}>
                {player}
              </Box>
            </>
          ) : (
            <Box ref={mediaBoxRef} sx={scrollTargetSx}>
              {isText ? (
                // The book, as it was uploaded, and nothing else. The
                // extracted text stays where it was always useful — the
                // search and the summary — and is not offered as a second,
                // OCR-read version of the page beside the original.
                <TextViewer
                  media={media}
                  bookmarks={bookmarks}
                  onAddBookmark={handleCreateTextBookmark}
                  jumpTo={readerTarget?.bookmark ?? null}
                  onPageChange={handleReaderPageChange}
                />
              ) : (
                player
              )}
            </Box>
          )}

          {!isAudio && dateLine({ fontSize: 13, mt: 1.5 })}

          {/* Its place in its course, and the way on (PRD CRS-1, CRS-3), in a
              card under the player (D-23). A book has no "next" to run on to. */}
          {!isText && <CourseTrackBar track={courseTrack} />}
        </Box>

        <Paper
          sx={{
            gridColumn: { [bp]: isAudio ? "span 7" : "span 5" },
            minWidth: 0,
            p: { xs: 3, md: 4 },
            display: "flex",
            flexDirection: "column",
          }}
        >
          <MediaInsightsTabs
            mediaId={media.id}
            tags={media.tags}
            insights={controller}
            onSeek={seekPlayer}
            // D-22: the panel stops growing here and scrolls inside the card.
            // On a phone the card grows with what is in it.
            contentMaxHeight={{ md: "70vh" }}
            // The transcript tab follows the lesson as it plays (PRD MOB-6).
            captions={captions}
            currentTime={currentTime}
            // Recorded in a live session (PRD REC-3): its chat, in a tab of
            // its own; a message's time plays the moment it was written.
            sessionChatPanel={media.session_id ? <SessionChatPanel mediaId={media.id} onSeek={seekPlayer} /> : null}
            // Proposed tags (PRD ARCH-4): for whoever may tag this lesson,
            // once it has a summary to propose them from.
            tagSuggestionsPanel={
              canEditTranscript && transcript?.ai_summary ? (
                <AiTagSuggestions mediaId={media.id} onTagged={refreshMedia} />
              ) : null
            }
            notesPanel={
              <NotesPanel
                bookmarks={bookmarks}
                currentTime={currentTime}
                // Not passed for a book: there is no playhead to read a
                // position off, so the panel hides its form entirely and
                // points at the reader instead. Withheld rather than merely
                // unused, so the panel cannot grow a path back to it.
                onCreateBookmark={isText ? undefined : handleCreateBookmark}
                // A bookmark in a book scrolls the reader; one on a recording
                // seeks the player. Same click, two coordinate spaces, and the
                // panel picks by which field the bookmark carries.
                onSeek={isText ? undefined : seekPlayer}
                onSeekText={isText ? jumpToBookmark : undefined}
                isText={isText}
              />
            }
            discussionPanel={
              <AIDiscussionPanel
                mediaId={media.id}
                // Its title and type name the source chips of an answer
                // saved to the notebook.
                media={media}
                transcript={transcript}
                isText={isText}
                // A hit in a recording seeks the player; one in a book turns
                // the reader to its page. Each kind gets only the one that
                // fits, so a hit cannot try to seek a player that is absent.
                onSeek={isText ? undefined : seekFromNotebook}
                onOpenPage={isText ? openPageFromDiscussion : undefined}
              />
            }
          />

          {/* The same bar the notebook's source preview renders — it owns the
              divider above it, and the share dialog, the lists menu and the
              download menu behind it. */}
          <MediaActionsBar
            media={media}
            transcript={transcript}
            currentTime={currentTime}
            isText={isText}
            isLiked={isLiked}
            onToggleLike={toggleLike}
            isSaved={isSaved}
            onToggleSave={toggleSave}
          />
        </Paper>
      </Box>

      {isAudio && dateLine({ fontSize: 14, mt: 4 })}

      {media.description && (
        <Typography
          dir="auto"
          sx={{ fontSize: 17, mt: isAudio && date ? 1 : 4 }}
        >
          {media.description}
        </Typography>
      )}

      <LessonNotebook
        media={media}
        isText={isText}
        currentTime={currentTime}
        readerPage={readerPage}
        bookmarks={bookmarks}
        onSeek={seekFromNotebook}
        onJumpTo={jumpFromNotebook}
      />
    </>
  );
};

export default MediaViewPage;
