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
import { useTranslation } from "react-i18next";
import { percentOf } from "../../../utilities/offlineStore";

// "הורדות להאזנה" (PRD MOB-2): the lessons this device keeps for listening with
// no network, the downloads still running, and the space they take.
//
// The one page that works with nothing answering on the other end — the app
// sends a reader here when it cannot reach the server (ProtectedRoute) — so it
// draws entirely from the device and links to a lesson's own page only when
// there is a network to open it with.

const OfflineNotice = ({ onRetry }) => {
  const { t } = useTranslation("downloads");
  return (
  <Alert
    severity="info"
    icon={<CloudOffOutlinedIcon />}
    action={<Button color="inherit" size="small" onClick={onRetry}>{t("retry")}</Button>}
    sx={{ mb: 3 }}
  >
    {t("offline")}
  </Alert>
  );
};

const DownloadingRow = ({ entry, onCancel }) => {
  const { t } = useTranslation("downloads");
  const percent = percentOf(entry.received, entry.total);
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography fontWeight={600} noWrap dir="auto" title={entry.title}>{entry.title}</Typography>
          <Typography variant="body2" color="text.secondary">{t("downloading", { progress: progressLabel(entry) })}</Typography>
        </Box>
        <Tooltip title={t("cancel")}>
          <IconButton onClick={() => onCancel(entry.id)} aria-label={t("cancelNamed", { title: entry.title })}>
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
  const { t } = useTranslation("downloads");
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
      <Tooltip title={isPlaying ? t("playing") : t("listen")}>
        <span>
          <IconButton
            onClick={() => onPlay(item.id)}
            disabled={isPlaying}
            aria-label={t("listenTo", { title: item.title })}
            sx={{ bgcolor: "primary.main", color: "primary.contrastText", "&:hover": { bgcolor: "primary.dark" }, "&.Mui-disabled": { bgcolor: "secondary.main", color: "secondary.contrastText" } }}
          >
            {isPlaying ? <GraphicEqRoundedIcon /> : <PlayArrowRoundedIcon />}
          </IconButton>
        </span>
      </Tooltip>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography fontWeight={600} noWrap dir="auto" title={item.title}>{item.title}</Typography>
        {byline && <Typography variant="body2" color="text.secondary" noWrap>{byline}</Typography>}
        <Typography variant="caption" color="text.secondary">{lessonDetails(item)}</Typography>
      </Box>
      {!offline && (
        <Tooltip title={t("toLesson")}>
          <IconButton onClick={() => onOpen(item.id)} aria-label={t("toLessonNamed", { title: item.title })}>
            <OpenInNewIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
      <Tooltip title={t("remove")}>
        <IconButton onClick={() => onRemove(item.id)} aria-label={t("removeNamed", { title: item.title })}>
          <DeleteOutlineIcon />
        </IconButton>
      </Tooltip>
    </Paper>
  );
};

const DownloadsPage = () => {
  const { t } = useTranslation(["downloads", "nav"]);
  const c = useDownloadsPageController();
  const { Icon, labelKey } = DOWNLOADS_SHELF;
  const empty = c.loaded && c.items.length === 0 && c.downloading.length === 0;

  return (
    <Box sx={{ bgcolor: "background.default" }}>
      <Box sx={{ maxWidth: 820, mx: "auto", p: { xs: 2, sm: 3 } }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
          <Icon color="primary" sx={{ fontSize: 34 }} />
          <Typography variant="h4" fontWeight={800} color="primary" sx={{ flex: 1 }}>
            {t(`nav:${labelKey}`)}
          </Typography>
          {c.items.length > 0 && (
            <Button color="error" onClick={c.askClear} endIcon={<DeleteOutlineIcon />}>{t("removeAllButton")}</Button>
          )}
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {c.items.length > 0
            ? t("summary", { count: c.items.length, storage: storageLine(c.totalSize, c.estimate) })
            : t("intro")}
        </Typography>

        {c.offline && <OfflineNotice onRetry={c.retry} />}

        {!c.supported && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            {t("unsupported")}
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
            <Typography fontWeight={700} sx={{ mb: 1 }}>{t("emptyTitle")}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: c.offline ? 0 : 2 }}>
              {t("emptyHow")}
            </Typography>
            {!c.offline && <Button variant="contained" onClick={c.goToArchive}>{t("toArchive")}</Button>}
          </Paper>
        )}
      </Box>

      <ConfirmingDeletionDialog
        open={c.confirmClear}
        onClose={c.cancelClear}
        onConfirm={c.clearAll}
        title={t("removeAll.title")}
        confirmLabel={t("removeAll.confirm")}
        message={
          c.items.length === 1
            ? t("removeAll.one")
            : t("removeAll.many", { count: c.items.length })
        }
      />
    </Box>
  );
};

export default DownloadsPage;
