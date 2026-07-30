import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import LinearProgress from "@mui/material/LinearProgress";
import Chip from "@mui/material/Chip";

const QueueRow = ({ name, stats }) => (
  <Box sx={{ mb: 2 }}>
    <Typography variant="subtitle2" fontWeight={600} mb={1}>{name}</Typography>
    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
      <Chip label={`ממתין: ${stats?.waiting ?? 0}`} size="small" color="default" />
      <Chip label={`פעיל: ${stats?.active ?? 0}`} size="small" color="warning" />
      <Chip label={`הושלם: ${stats?.completed ?? 0}`} size="small" color="success" />
      <Chip label={`נכשל: ${stats?.failed ?? 0}`} size="small" color="error" />
    </Box>
    {stats?.active > 0 && <LinearProgress sx={{ mt: 1 }} />}
  </Box>
);

const QueueStatus = ({ queueStatus }) => (
  <Box>
    <Typography variant="h6" fontWeight={700} mb={2}>מצב תורים</Typography>
    <QueueRow name="תור תמלול" stats={queueStatus?.transcription} />
    <QueueRow name="תור AI" stats={queueStatus?.llm} />
  </Box>
);

export default QueueStatus;
