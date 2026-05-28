import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
};

const ChaptersPanel = ({ chapters = [], onSeek }) => {
  if (!chapters.length) return null;

  return (
    <Box>
      <Typography variant="subtitle1" fontWeight={600} mb={1}>פרקים</Typography>
      <List disablePadding dense>
        {chapters.map((chapter, i) => (
          <ListItemButton key={i} onClick={() => onSeek?.(chapter.start_time)} sx={{ borderRadius: 1, mb: 0.5 }}>
            <ListItemText
              primary={chapter.title}
              secondary={`${formatTime(chapter.start_time)} — ${formatTime(chapter.end_time)}`}
            />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );
};

export default ChaptersPanel;
