import { useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import IconButton from "@mui/material/IconButton";
import DeleteIcon from "@mui/icons-material/Delete";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import { useDispatch } from "react-redux";
import { deleteBookmark } from "../../../../store/slicesAndThunks/bookmarksSlice/bookmarksDelete";
import { formatTime } from "../../../../utilities/formatTime";

// "Active" bookmark = the latest one whose timestamp is <= current playback.
// That's the one the user is "inside" right now.
const findActiveBookmarkId = (bookmarks, currentTime) => {
  let activeId = null;
  for (const bm of bookmarks) {
    if (bm.timestamp_seconds <= currentTime) activeId = bm.id;
    else break;
  }
  return activeId;
};

const NotesPanel = ({ bookmarks = [], currentTime = 0, onCreateBookmark, onSeek }) => {
  const dispatch = useDispatch();
  const [note, setNote] = useState("");

  const handleCreate = () => {
    onCreateBookmark(Math.floor(currentTime), note);
    setNote("");
  };

  // bookmarks already arrive sorted ASC by timestamp from the API.
  const activeId = findActiveBookmarkId(bookmarks, Math.floor(currentTime));

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Typography variant="subtitle1" fontWeight={600}>סימניות והערות</Typography>

      <Box sx={{ display: "flex", gap: 1 }}>
        <TextField
          label="הוסף הערה בזמן הנוכחי"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          size="small"
          fullWidth
          placeholder={`בזמן ${formatTime(Math.floor(currentTime))}`}
        />
        <Button variant="contained" onClick={handleCreate} startIcon={<BookmarkIcon />} sx={{ flexShrink: 0 }}>
          שמור
        </Button>
      </Box>

      <List dense disablePadding>
        {bookmarks.map((bm) => {
          const isActive = bm.id === activeId;
          return (
            <ListItemButton
              key={bm.id}
              onClick={() => onSeek?.(bm.timestamp_seconds)}
              sx={{
                bgcolor: isActive ? "primary.light" : "grey.50",
                color: isActive ? "primary.contrastText" : "inherit",
                borderRadius: 1,
                mb: 0.5,
                pr: 6,
                "&:hover": { bgcolor: isActive ? "primary.main" : "grey.100" },
              }}
            >
              <ListItemText
                primary={bm.note || "(ללא הערה)"}
                secondary={`בזמן ${formatTime(bm.timestamp_seconds)}`}
                secondaryTypographyProps={{
                  sx: { color: isActive ? "primary.contrastText" : "text.secondary", opacity: isActive ? 0.85 : 1 },
                }}
              />
              <IconButton
                size="small"
                onClick={(e) => { e.stopPropagation(); dispatch(deleteBookmark(bm.id)); }}
                sx={{ position: "absolute", right: 8, color: isActive ? "primary.contrastText" : "inherit" }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </ListItemButton>
          );
        })}
      </List>
    </Box>
  );
};

export default NotesPanel;
