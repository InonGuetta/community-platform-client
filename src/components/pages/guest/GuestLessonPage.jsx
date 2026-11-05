import { Link as RouterLink } from "react-router-dom";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { useGuestLessonPageController } from "./useGuestLessonPageController";
import { creatorPrefixes, defaultCreatorName } from "../../../utilities/constant";
import { formatTime } from "../../../utilities/formatTime";

// One lesson its lecturer made public, for whoever has the link (PRD COM-3b,
// COM-4) — usually someone with no account, arriving from WhatsApp.
//
// Deliberately less than the lesson page: the recording or the document, what
// it is about (summary and key points), and a way in. No notebook, no chat, no
// transcript, no likes — those are what an account is for, and what the call to
// action below offers. Rendered without the app's navigation bar, whose every
// link would send a guest to sign in.

const Header = ({ signedIn }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: { xs: 2, sm: 3 }, py: 1.5, borderBottom: 1, borderColor: "divider", bgcolor: "background.paper" }}>
    <Box component="img" src="/icons/icon-192.png" alt="" sx={{ width: 32, height: 32, borderRadius: 1 }} />
    <Typography variant="h6" fontWeight={800} color="primary" sx={{ flex: 1 }}>פלטפורמת הקהילה</Typography>
    {!signedIn && (
      <>
        <Button component={RouterLink} to="/sign-in" size="small">כניסה</Button>
        <Button component={RouterLink} to="/sign-up" size="small" variant="contained">הרשמה</Button>
      </>
    )}
  </Box>
);

const Player = ({ lesson, src }) => {
  if (lesson.media_type === "video") {
    return <Box component="video" controls preload="metadata" src={src} sx={{ width: "100%", borderRadius: 2, bgcolor: "black" }} />;
  }
  if (lesson.media_type === "audio") {
    return <Box component="audio" controls preload="metadata" src={src} dir="ltr" sx={{ width: "100%" }} />;
  }
  return (
    <Button variant="contained" href={src} target="_blank" rel="noopener" endIcon={<OpenInNewIcon />}>
      פתיחת המסמך
    </Button>
  );
};

const GuestLessonPage = () => {
  const c = useGuestLessonPageController();
  const lesson = c.lesson;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <Header signedIn={c.signedIn} />
      <Box sx={{ maxWidth: 820, mx: "auto", p: { xs: 2, sm: 3 } }}>
        {c.status === "loading" && <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box>}

        {c.status === "failed" && (
          <Paper variant="outlined" sx={{ p: 4, textAlign: "center", borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>השיעור הזה לא פתוח לציבור</Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              ייתכן שהקישור שגוי, או שהמרצה סגר את השיעור. שיעורי הקהילה פתוחים לחברים רשומים.
            </Typography>
            <Button component={RouterLink} to={c.signedIn ? "/archive" : "/sign-in"} variant="contained">
              {c.signedIn ? "לארכיון" : "כניסה"}
            </Button>
          </Paper>
        )}

        {lesson && (
          <>
            <Typography variant="h4" fontWeight={800} color="primary" sx={{ mb: 0.5 }}>{lesson.title}</Typography>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center", mb: 2 }}>
              {lesson.creator_name && lesson.creator_name !== defaultCreatorName && (
                <Typography color="text.secondary">
                  {creatorPrefixes[lesson.media_type] || creatorPrefixes.video}: {lesson.creator_name}
                </Typography>
              )}
              {lesson.course_title && <Chip size="small" variant="outlined" label={lesson.course_title} />}
              {lesson.duration_seconds > 0 && <Chip size="small" variant="outlined" label={formatTime(lesson.duration_seconds)} />}
            </Box>

            <Box sx={{ mb: 3 }}><Player lesson={lesson} src={c.streamUrl} /></Box>

            {(lesson.ai_summary || lesson.description) && (
              <Paper variant="outlined" sx={{ p: 2.5, mb: 2, borderRadius: 3 }}>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>על השיעור</Typography>
                <Typography sx={{ whiteSpace: "pre-line", lineHeight: 1.8 }}>{lesson.ai_summary || lesson.description}</Typography>
                {Array.isArray(lesson.ai_key_points) && lesson.ai_key_points.length > 0 && (
                  <Box component="ul" sx={{ mt: 2, mb: 0, pr: 2.5, pl: 0 }}>
                    {lesson.ai_key_points.map((point, i) => (
                      <Typography component="li" key={i} sx={{ mb: 0.5 }}>{typeof point === "string" ? point : point?.text}</Typography>
                    ))}
                  </Box>
                )}
              </Paper>
            )}

            <Paper sx={{ p: 2.5, borderRadius: 3, bgcolor: "primary.main", color: "primary.contrastText" }}>
              {c.signedIn ? (
                <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
                  <Typography sx={{ flex: 1 }}>בעמוד השיעור המלא יש גם מחברת, סימניות ודיון עם AI.</Typography>
                  <Button component={RouterLink} to={c.fullLessonPath} variant="contained" color="secondary">לעמוד השיעור המלא</Button>
                </Box>
              ) : (
                <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
                  <Typography sx={{ flex: 1 }}>
                    חברי הקהילה רושמים הערות על השיעור, שומרים סימניות ושואלים עליו את ה-AI, וכל זה על עוד מאות שיעורים.
                  </Typography>
                  <Button component={RouterLink} to="/sign-up" variant="contained" color="secondary">הצטרפות לקהילה</Button>
                </Box>
              )}
            </Paper>
          </>
        )}
      </Box>
    </Box>
  );
};

export default GuestLessonPage;
