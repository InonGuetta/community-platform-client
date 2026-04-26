import { useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import IconButton from "@mui/material/IconButton";
import DeleteIcon from "@mui/icons-material/Delete";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import { useDispatch } from "react-redux";
import { deleteBookmark } from "../../../../store/slicesAndThunks/bookmarksSlice/bookmarksDelete";

const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

const NotesPanel = ({ bookmarks = [], currentTime = 0, onCreateBookmark }) => {
  const dispatch = useDispatch();
  const [note, setNote] = useState("");

  const handleCreate = () => {
    onCreateBookmark(Math.floor(currentTime), note);
    setNote("");
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Typography variant="subtitle1" fontWeight={600}>Bookmarks & Notes</Typography>

      <Box sx={{ display: "flex", gap: 1 }}>
        <TextField
          label="Add note at current time"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          size="small"
          fullWidth
          placeholder={`At ${formatTime(Math.floor(currentTime))}`}
        />
        <Button variant="contained" onClick={handleCreate} startIcon={<BookmarkIcon />} sx={{ flexShrink: 0 }}>
          Save
        </Button>
      </Box>

      <List dense disablePadding>
        {bookmarks.map((bm) => (
          <ListItem
            key={bm.id}
            secondaryAction={
              <IconButton size="small" onClick={() => dispatch(deleteBookmark(bm.id))} edge="end">
                <DeleteIcon fontSize="small" />
              </IconButton>
            }
            sx={{ bgcolor: "grey.50", borderRadius: 1, mb: 0.5 }}
          >
            <ListItemText
              primary={bm.note || "(no note)"}
              secondary={`at ${formatTime(bm.timestamp_seconds)}`}
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default NotesPanel;
