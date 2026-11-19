import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import LinearProgress from "@mui/material/LinearProgress";
import Chip from "@mui/material/Chip";
import { useTranslation } from "react-i18next";

const QueueRow = ({ name, stats }) => {
  const { t } = useTranslation("admin");
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle2" fontWeight={600} mb={1}>{name}</Typography>
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
        <Chip label={t("queues.waiting", { n: stats?.waiting ?? 0 })} size="small" color="default" />
        <Chip label={t("queues.active", { n: stats?.active ?? 0 })} size="small" color="warning" />
        <Chip label={t("queues.completed", { n: stats?.completed ?? 0 })} size="small" color="success" />
        <Chip label={t("queues.failed", { n: stats?.failed ?? 0 })} size="small" color="error" />
      </Box>
      {stats?.active > 0 && <LinearProgress sx={{ mt: 1 }} />}
    </Box>
  );
};

const QueueStatus = ({ queueStatus }) => {
  const { t } = useTranslation("admin");
  return (
    <Box>
      <Typography variant="h6" fontWeight={700} mb={2}>{t("queues.title")}</Typography>
      <QueueRow name={t("queues.transcription")} stats={queueStatus?.transcription} />
      <QueueRow name={t("queues.llm")} stats={queueStatus?.llm} />
    </Box>
  );
};

export default QueueStatus;
