import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import LinearProgress from "@mui/material/LinearProgress";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";

const QueueRow = ({ name, stats }) => (
  <Box sx={{ mb: 2 }}>
    <Typography variant="subtitle2" fontWeight={600} mb={1}>{name}</Typography>
    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
      <Chip label={`Waiting: ${stats?.waiting ?? 0}`} size="small" color="default" />
      <Chip label={`Active: ${stats?.active ?? 0}`} size="small" color="warning" />
      <Chip label={`Done: ${stats?.completed ?? 0}`} size="small" color="success" />
      <Chip label={`Failed: ${stats?.failed ?? 0}`} size="small" color="error" />
    </Box>
    {stats?.active > 0 && <LinearProgress sx={{ mt: 1 }} />}
  </Box>
);

const QueueStatus = ({ queueStatus }) => (
  <Box>
    <Typography variant="h6" fontWeight={700} mb={2}>Queue Status</Typography>
    <QueueRow name="Transcription Queue" stats={queueStatus?.transcription} />
    <QueueRow name="LLM Queue" stats={queueStatus?.llm} />
  </Box>
);

export default QueueStatus;
