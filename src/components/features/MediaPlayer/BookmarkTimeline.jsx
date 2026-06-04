import Box from "@mui/material/Box";
import Tooltip from "@mui/material/Tooltip";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import { formatTime } from "../../../utilities/formatTime";

const BookmarkTimeline = ({ bookmarks, duration, onSeek }) => {
  if (!duration || !bookmarks?.length) return null;

  return (
    <Box sx={{ position: "relative", height: 20, width: "100%", mt: 0.5 }}>
      {bookmarks.map((bm) => {
        const pct = (bm.timestamp_seconds / duration) * 100;
        return (
          <Tooltip key={bm.id} title={bm.note || formatTime(bm.timestamp_seconds)} placement="top">
            <Box
              onClick={() => onSeek(bm.timestamp_seconds)}
              sx={{
                position: "absolute",
                left: `${pct}%`,
                transform: "translateX(-50%)",
                cursor: "pointer",
                color: "primary.main",
                "&:hover": { color: "primary.dark" },
              }}
            >
              <BookmarkIcon sx={{ fontSize: 16 }} />
            </Box>
          </Tooltip>
        );
      })}
    </Box>
  );
};

export default BookmarkTimeline;
