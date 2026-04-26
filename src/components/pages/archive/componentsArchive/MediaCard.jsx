import Card from "@mui/material/Card";
import CardMedia from "@mui/material/CardMedia";
import CardContent from "@mui/material/CardContent";
import CardActions from "@mui/material/CardActions";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Box from "@mui/material/Box";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import VideoFileIcon from "@mui/icons-material/VideoFile";
import AudioFileIcon from "@mui/icons-material/AudioFile";
import ArticleIcon from "@mui/icons-material/Article";

const TYPE_ICON = { video: <VideoFileIcon />, audio: <AudioFileIcon />, text: <ArticleIcon /> };
const TYPE_COLOR = { video: "primary", audio: "secondary", text: "success" };

const MediaCard = ({ item, onView }) => (
  <Card sx={{ height: "100%", display: "flex", flexDirection: "column", transition: "transform 0.2s", "&:hover": { transform: "translateY(-4px)", boxShadow: 4 } }}>
    {item.thumbnail_url ? (
      <CardMedia component="img" height={160} image={item.thumbnail_url} alt={item.title} />
    ) : (
      <Box sx={{ height: 160, bgcolor: "grey.100", display: "flex", alignItems: "center", justifyContent: "center", color: "grey.400" }}>
        {TYPE_ICON[item.media_type]}
      </Box>
    )}
    <CardContent sx={{ flexGrow: 1, pb: 0 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 0.5 }}>
        <Typography variant="subtitle2" fontWeight={600} noWrap sx={{ flex: 1 }}>{item.title}</Typography>
        <Chip label={item.media_type} color={TYPE_COLOR[item.media_type]} size="small" sx={{ ml: 1 }} />
      </Box>
      {item.description && (
        <Typography variant="body2" color="text.secondary" sx={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {item.description}
        </Typography>
      )}
    </CardContent>
    <CardActions>
      <Button startIcon={<PlayArrowIcon />} size="small" variant="contained" onClick={() => onView(item.id)} fullWidth>
        Watch
      </Button>
    </CardActions>
  </Card>
);

export default MediaCard;
