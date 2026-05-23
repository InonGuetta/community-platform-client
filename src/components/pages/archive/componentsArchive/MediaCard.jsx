import Card from "@mui/material/Card";
import CardMedia from "@mui/material/CardMedia";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Chip from "@mui/material/Chip";
import Box from "@mui/material/Box";
import DeleteIcon from "@mui/icons-material/Delete";
import VideoFileIcon from "@mui/icons-material/VideoFile";
import AudioFileIcon from "@mui/icons-material/AudioFile";
import ArticleIcon from "@mui/icons-material/Article";
import { roles } from "../../../../utilities/constant";

const TYPE_ICON = { video: <VideoFileIcon />, audio: <AudioFileIcon />, text: <ArticleIcon /> };
const TYPE_COLOR = { video: "primary", audio: "secondary", text: "success" };
const TYPE_IMAGE = { video: "/images/video_image.png", audio: "/images/audio_image.png", text: "/images/book_image.png" };
const TYPE_IMAGE_STYLE = {
  video: { height: 160, scale: 1.20 },
  audio: { height: 160, scale: 0.90 },
  text:  { height: 160, scale: 0.80 },
};

const canDelete = (user, item) =>
  user?.role === roles.admin || (user?.role === roles.lecturer && item.uploader_id === user.id);

const MediaCard = ({ item, onView, user, onDelete }) => (
  <Card onClick={() => onView(item.id)} sx={{ height: "100%", display: "flex", flexDirection: "column", cursor: "pointer", transition: "transform 0.2s", "&:hover": { transform: "translateY(-4px)", boxShadow: 4 } }}>
    {item.thumbnail_url ? (
      <CardMedia component="img" height={160} image={item.thumbnail_url} alt={item.title} />
    ) : (
      <CardMedia component="img" height={TYPE_IMAGE_STYLE[item.media_type].height} image={TYPE_IMAGE[item.media_type]} alt={item.title} sx={{ objectFit: "contain", transform: `scale(${TYPE_IMAGE_STYLE[item.media_type].scale})`, transformOrigin: "center center" }} />
    )}
    <CardContent sx={{ flexGrow: 1, pb: 0 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 0.5 }}>
        <Typography variant="subtitle2" fontWeight={600} noWrap sx={{ flex: 1 }}>{item.title}</Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, ml: 1 }}>
          <Chip label={item.media_type} color={TYPE_COLOR[item.media_type]} size="small" />
          {canDelete(user, item) && (
            <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      </Box>
      {item.description && (
        <Typography variant="body2" color="text.secondary" sx={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {item.description}
        </Typography>
      )}
    </CardContent>
  </Card>
);

export default MediaCard;
