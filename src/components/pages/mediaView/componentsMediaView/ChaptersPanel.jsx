import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
};

const ChaptersPanel = ({
  keyPointHeadings = [],
  onSeek,
  canEdit = false,
  canGenerate = false,
  generating = false,
  onGenerate,
}) => {
  const hasHeadings = keyPointHeadings.length > 0;

  // Nothing to show and no one allowed to generate — render nothing.
  if (!hasHeadings && !canEdit) return null;

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
        <Typography variant="subtitle1" fontWeight={600}>כותרות משנה לפי נקודות מפתח</Typography>
        {canEdit && (
          <Button
            size="small"
            variant="outlined"
            onClick={onGenerate}
            disabled={generating || !canGenerate}
            startIcon={generating ? <CircularProgress size={14} /> : null}
          >
            {generating ? "מייצר..." : hasHeadings ? "צור מחדש" : "צור כותרות משנה"}
          </Button>
        )}
      </Box>

      {hasHeadings ? (
        <List disablePadding dense>
          {keyPointHeadings.map((heading, i) => (
            <ListItemButton key={i} onClick={() => onSeek?.(heading.start_time)} sx={{ borderRadius: 1, mb: 0.5 }}>
              <ListItemText
                primary={heading.title}
                secondary={formatTime(heading.start_time)}
              />
            </ListItemButton>
          ))}
        </List>
      ) : (
        <Typography variant="body2" color="text.secondary">
          {canGenerate
            ? "לחץ 'צור כותרות משנה' כדי לחלק את התמלול לכותרות לפי נקודות המפתח."
            : "כותרות משנה יהיו זמינות לאחר שהתמלול והסיכום מוכנים."}
        </Typography>
      )}
    </Box>
  );
};

export default ChaptersPanel;
