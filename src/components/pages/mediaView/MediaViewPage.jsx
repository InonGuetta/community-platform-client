import { useState } from "react";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";
import Divider from "@mui/material/Divider";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import MediaPlayer from "../../features/MediaPlayer/MediaPlayer";
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

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight={700} mb={2}>{media.title}</Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <MediaPlayer
            url={media.s3_key}
            bookmarks={bookmarks}
            duration={media.duration_seconds}
            onProgress={(sec) => { setCurrentTime(sec); handleSaveProgress(sec); }}
            segments={segments}
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: "100%" }}>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth" sx={{ mb: 2 }}>
              <Tab label="Summary" />
              <Tab label="Chapters" />
              <Tab label="Notes" />
              {(user?.role === roles.lecturer || user?.role === roles.admin) && (
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
            {tab === 3 && (user?.role === roles.lecturer || user?.role === roles.admin) && (
              <TranscriptEditor transcript={transcript} mediaId={media.id} />
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
