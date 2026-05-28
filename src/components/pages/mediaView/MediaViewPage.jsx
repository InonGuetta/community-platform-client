import { useState } from "react";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";
import Divider from "@mui/material/Divider";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import IconButton from "@mui/material/IconButton";
import MediaPlayer from "../../features/MediaPlayer/MediaPlayer";
import TextViewer from "./componentsMediaView/TextViewer";
import AISummaryPanel from "./componentsMediaView/AISummaryPanel";
import ChaptersPanel from "./componentsMediaView/ChaptersPanel";
import NotesPanel from "./componentsMediaView/NotesPanel";
import TranscriptEditor from "../../features/TranscriptEditor/TranscriptEditor";
import useMediaViewPageController from "./useMediaViewPageController";
import { useSelector } from "react-redux";
import { selectUser } from "../../../store/selectors/authSelectors";
import { roles } from "../../../utilities/constant";

// ממיר chunks לפורמט שה-MediaPlayer מצפה לו לכתוביות
const chunksToSegments = (chunks = []) =>
  chunks.map((c) => ({
    start: c.start_time,
    end: c.end_time,
    text: c.content,
  }));

const MediaViewPage = () => {
  const { media, transcript, bookmarks, handleSaveProgress, handleCreateBookmark } =
    useMediaViewPageController();
  const [tab, setTab] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const user = useSelector(selectUser);

  if (!media) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  const chapters  = transcript?.ai_chapters || [];
  const segments  = chunksToSegments(transcript?.chunks);
  // Transcript tab is visible to everyone on audio/video; editing/triggering
  // is gated inside TranscriptEditor itself based on role.
  const showTranscriptTab = media.media_type !== "text";
  const canEditTranscript =
    user?.role === roles.lecturer || user?.role === roles.admin;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>{media.title}</Typography>
        <IconButton
          component="a"
          href={`/api/media/${media.id}/download`}
          download
          aria-label="Download"
          title="הורדה"
          sx={{ p: 0.75, "&:hover": { bgcolor: "action.hover" } }}
        >
          <Box component="img" src="/images/download_image.png" alt="Download" sx={{ width: 26, height: 26 }} />
        </IconButton>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          {media.media_type === "text" ? (
            <TextViewer mediaId={media.id} />
          ) : (
            <MediaPlayer
              url={`/api/media/${media.id}/stream`}
              bookmarks={bookmarks}
              duration={media.duration_seconds}
              onProgress={(sec) => { setCurrentTime(sec); handleSaveProgress(sec); }}
              segments={segments}
            />
          )}
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: "100%" }}>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth" sx={{ mb: 2 }}>
              <Tab label="Summary" />
              <Tab label="Chapters" />
              <Tab label="Notes" />
              {showTranscriptTab && (
                <Tab label="Transcript" />
              )}
            </Tabs>

            {tab === 0 && <AISummaryPanel transcript={transcript} />}
            {tab === 1 && <ChaptersPanel chapters={chapters} />}
            {tab === 2 && (
              <NotesPanel
                bookmarks={bookmarks}
                currentTime={currentTime}
                onCreateBookmark={handleCreateBookmark}
              />
            )}
            {tab === 3 && showTranscriptTab && (
              <TranscriptEditor
                transcript={transcript}
                mediaId={media.id}
                canEdit={canEditTranscript}
              />
            )}
          </Paper>
        </Grid>
      </Grid>

      {media.description && (
        <Box sx={{ mt: 3 }}>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="body1" color="text.secondary">
            {media.description}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default MediaViewPage;
