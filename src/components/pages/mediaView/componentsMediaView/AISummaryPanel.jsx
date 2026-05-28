import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";

const AISummaryPanel = ({ transcript }) => {
  if (!transcript?.ai_summary) return null;

  const keyPoints = transcript.ai_key_points || [];

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Typography variant="subtitle1" fontWeight={600}>סיכום AI</Typography>
      <Typography variant="body2" color="text.secondary">{transcript.ai_summary}</Typography>

      {keyPoints.length > 0 && (
        <>
          <Divider />
          <Typography variant="subtitle2" fontWeight={600}>נקודות מפתח</Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {keyPoints.map((point, i) => (
              <Chip key={i} label={point} size="small" variant="outlined" color="primary" />
            ))}
          </Box>
        </>
      )}
    </Box>
  );
};

export default AISummaryPanel;
