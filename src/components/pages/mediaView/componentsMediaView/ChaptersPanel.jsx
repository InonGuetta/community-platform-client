import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import { formatTime } from "../../../../utilities/formatTime";
import { RADIUS } from "../../../../theme/tokens";
import { useTranslation } from "react-i18next";

const ChaptersPanel = ({
  keyPointHeadings = [],
  onSeek,
  canEdit = false,
  canGenerate = false,
  generating = false,
  onGenerate,
}) => {
  const { t } = useTranslation("lesson");
  const hasHeadings = keyPointHeadings.length > 0;

  // Nothing to show and no one allowed to generate — render nothing.
  if (!hasHeadings && !canEdit) return null;

  return (
    <Box>
      <Typography variant="display" component="h3" sx={{ fontSize: 24, mb: 1.5 }}>{t("chapters.title")}</Typography>

      {hasHeadings ? (
        <List disablePadding dense sx={{ mb: canEdit ? 3 : 0 }}>
          {keyPointHeadings.map((heading, i) => (
            <ListItemButton key={i} onClick={() => onSeek?.(heading.start_time)} sx={{ borderRadius: `${RADIUS.menu}px`, mb: 0.5 }}>
              <ListItemText
                primary={heading.title}
                primaryTypographyProps={{ dir: "auto", fontWeight: 600 }}
                secondary={formatTime(heading.start_time)}
              />
            </ListItemButton>
          ))}
        </List>
      ) : (
        <Typography sx={{ fontSize: 15, color: "text.secondary", mb: canEdit ? 3 : 0 }}>
          {canGenerate
            ? t("chapters.howTo")
            : t("chapters.notYet")}
        </Typography>
      )}

      {/* The queued job: `generating` is the page's headings_status polling. */}
      {canEdit && (
        <Button
          variant={hasHeadings ? "soft" : "contained"}
          onClick={onGenerate}
          disabled={generating || !canGenerate}
          startIcon={generating ? <CircularProgress size={14} color="inherit" /> : <AutoAwesomeOutlinedIcon />}
        >
          {generating ? t("chapters.generating") : hasHeadings ? t("chapters.regenerate") : t("chapters.generate")}
        </Button>
      )}
    </Box>
  );
};

export default ChaptersPanel;
