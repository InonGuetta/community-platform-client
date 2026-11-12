import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Alert from "@mui/material/Alert";
import LinearProgress from "@mui/material/LinearProgress";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import GraphicEqRoundedIcon from "@mui/icons-material/GraphicEqRounded";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import CloseIcon from "@mui/icons-material/Close";
import CloudOffOutlinedIcon from "@mui/icons-material/CloudOffOutlined";
import ConfirmingDeletionDialog from "../../features/ConfirmingDeletionDialog/ConfirmingDeletionDialog";
import OfflinePlayer from "./OfflinePlayer";
import { useDownloadsPageController } from "./useDownloadsPageController";
import { lessonByline, lessonDetails, progressLabel, storageLine } from "./downloadsText";
import { DOWNLOADS_SHELF } from "../../layout/personalShelves";
import { countLabel } from "../../../utilities/countLabel";
import { percentOf } from "../../../utilities/offlineStore";

// "הורדות להאזנה" (PRD MOB-2): the lessons this device keeps for listening with
// no network, the downloads still running, and the space they take.
//
// The one page that works with nothing answering on the other end — the app
// sends a reader here when it cannot reach the server (ProtectedRoute) — so it
// draws entirely from the device and links to a lesson's own page only when
// there is a network to open it with.

const OfflineNotice = ({ onRetry }) => (
  <Alert
    severity="info"
    icon={<CloudOffOutlinedIcon />}
    action={<Button color="inherit" size="small" onClick={onRetry}>נסו שוב</Button>}
    sx={{ mb: 3 }}
  >
    אין חיבור לשרת. השיעורים שהורדתם זמינים כאן להאזנה.
  </Alert>
);

const DownloadingRow = ({ entry, onCancel }) => {
  const percent = percentOf(entry.received, entry.total);
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography fontWeight={600} noWrap title={entry.title}>{entry.title}</Typography>
          <Typography variant="body2" color="text.secondary">מוריד… {progressLabel(entry)}</Typography>
        </Box>
        <Tooltip title="ביטול ההורדה">
          <IconButton onClick={() => onCancel(entry.id)} aria-label={`ביטול ההורדה של ${entry.title}`}>
            <CloseIcon />
          </IconButton>
        </Tooltip>
      </Box>
      <LinearProgress
        variant={percent === null ? "indeterminate" : "determinate"}
        value={percent ?? 0}
        sx={{ mt: 1, borderRadius: 1 }}
      />
    </Paper>
  );
};

const LessonRow = ({ item, isPlaying, offline, onPlay, onOpen, onRemove }) => {
  const byline = lessonByline(item);
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.5,
        borderRadius: 2,
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        borderColor: isPlaying ? "secondary.main" : "divider",
      }}
    >
      <Tooltip title={isPlaying ? "מתנגן עכשיו" : "האזנה"}>
        <span>
          <IconButton
            onClick={() => onPlay(item.id)}
            disabled={isPlaying}
            aria-label={`האזנה ל${item.title}`}
            sx={{ bgcolor: "primary.main", color: "primary.contrastText", "&:hover": { bgcolor: "primary.dark" }, "&.Mui-disabled": { bgcolor: "secondary.main", color: "secondary.contrastText" } }}
          >
            {isPlaying ? <GraphicEqRoundedIcon /> : <PlayArrowRoundedIcon />}
          </IconButton>
        </span>
      </Tooltip>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography fontWeight={600} noWrap title={item.title}>{item.title}</Typography>
        {byline && <Typography variant="body2" color="text.secondary" noWrap>{byline}</Typography>}
        <Typography variant="caption" color="text.secondary">{lessonDetails(item)}</Typography>
      </Box>
      {!offline && (
        <Tooltip title="לדף השיעור">
          <IconButton onClick={() => onOpen(item.id)} aria-label={`לדף השיעור ${item.title}`}>
            <OpenInNewIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
      <Tooltip title="מחיקה מהמכשיר">
        <IconButton onClick={() => onRemove(item.id)} aria-label={`מחיקת ${item.title} מהמכשיר`}>
          <DeleteOutlineIcon />
        </IconButton>
      </Tooltip>
    </Paper>
  );
};

const DownloadsPage = () => {
  const c = useDownloadsPageController();
  const { Icon } = DOWNLOADS_SHELF;
  const empty = c.loaded && c.items.length === 0 && c.downloading.length === 0;

  return (
    <Box sx={{ bgcolor: "background.default", minHeight: "calc(100vh - 64px)" }}>
      <Box sx={{ maxWidth: 820, mx: "auto", p: { xs: 2, sm: 3 } }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
          <Icon color="primary" sx={{ fontSize: 34 }} />
          <Typography variant="h4" fontWeight={800} color="primary" sx={{ flex: 1 }}>
            {DOWNLOADS_SHELF.label}
          </Typography>
          {c.items.length > 0 && (
            <Button color="error" onClick={c.askClear} endIcon={<DeleteOutlineIcon />}>מחיקת הכל</Button>
          )}
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {c.items.length > 0
            ? `${countLabel(c.items.length, "שיעור אחד", "שיעורים")} במכשיר · ${storageLine(c.totalSize, c.estimate)}`
            : "שיעורים שמורים במכשיר הזה ומתנגנים גם בלי רשת."}
        </Typography>

        {c.offline && <OfflineNotice onRetry={c.retry} />}

        {!c.supported && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            הדפדפן הזה לא מאפשר לשמור שיעורים להאזנה בלי רשת. נסו דפדפן עדכני, כמו Chrome או Safari.
          </Alert>
        )}

        {c.playing && <OfflinePlayer key={c.playing.id} item={c.playing} onClose={c.closePlayer} />}

        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {c.downloading.map((entry) => (
            <DownloadingRow key={`downloading-${entry.id}`} entry={entry} onCancel={c.cancel} />
          ))}
          {c.items.map((item) => (
            <LessonRow
              key={item.id}
              item={item}
              isPlaying={c.playing?.id === item.id}
              offline={c.offline}
              onPlay={c.play}
              onOpen={c.openLesson}
              onRemove={c.remove}
            />
          ))}
        </Box>

        {empty && (
          <Paper variant="outlined" sx={{ p: 4, textAlign: "center", borderRadius: 3, borderStyle: "dashed" }}>
            <Typography fontWeight={700} sx={{ mb: 1 }}>עוד לא הורדתם שיעורים</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: c.offline ? 0 : 2 }}>
              בדף של שיעור שמע או וידאו, לחצו על ״הורדה״ ובחרו ״שמירה להאזנה בלי רשת״.
            </Typography>
            {!c.offline && <Button variant="contained" onClick={c.goToArchive}>לארכיון</Button>}
          </Paper>
        )}
      </Box>

      <ConfirmingDeletionDialog
        open={c.confirmClear}
        onClose={c.cancelClear}
        onConfirm={c.clearAll}
        title="מחיקת כל ההורדות"
        confirmLabel="מחיקת הכל"
        message={
          c.items.length === 1
            ? "למחוק מהמכשיר את השיעור שהורדתם? אפשר להוריד אותו שוב כשיש רשת."
            : `למחוק מהמכשיר את כל ${c.items.length} השיעורים שהורדתם? אפשר להוריד אותם שוב כשיש רשת.`
        }
      />
    </Box>
  );
};

export default DownloadsPage;
