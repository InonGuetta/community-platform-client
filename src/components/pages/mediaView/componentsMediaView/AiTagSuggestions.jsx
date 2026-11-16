import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import CircularProgress from "@mui/material/CircularProgress";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import useAiTagSuggestions from "../useAiTagSuggestions";
import { useTranslation } from "react-i18next";

// "תגיות מוצעות" (PRD ARCH-4) at the foot of the summary, for whoever may tag
// the lesson: what the model proposed after reading the summary, each with its
// place in the tree and the reason it gave, to accept or dismiss one by one or
// all together. With nothing waiting, a way to ask — for a lesson processed
// before proposals existed.
const AiTagSuggestions = ({ mediaId, onTagged, canRequest = true }) => {
  const { t } = useTranslation("lesson");
  const s = useAiTagSuggestions({ mediaId, enabled: true, onTagged });
  if (s.loading) return null;
  const ids = s.suggestions.map((t) => t.id);

  return (
    <Paper variant="outlined" sx={{ p: 1.5, mt: 2, borderRadius: 2, borderStyle: "dashed" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: s.suggestions.length ? 1 : 0, flexWrap: "wrap" }}>
        <AutoAwesomeOutlinedIcon fontSize="small" color="secondary" />
        <Typography fontWeight={700} sx={{ flex: 1 }}>{t("aiTags.title")}</Typography>
        {s.working && <CircularProgress size={18} />}
        {s.suggestions.length > 1 && (
          <>
            <Button size="small" disabled={s.working} onClick={() => s.approve(ids)}>{t("aiTags.approveAll")}</Button>
            <Button size="small" color="inherit" disabled={s.working} onClick={() => s.dismiss(null)}>{t("aiTags.dismissAll")}</Button>
          </>
        )}
        {s.suggestions.length === 0 && canRequest && (
          <Button size="small" variant="outlined" disabled={s.working} onClick={s.request}>{t("aiTags.request")}</Button>
        )}
      </Box>

      {s.suggestions.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {t("aiTags.none")}
        </Typography>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
          {s.suggestions.map((tag) => (
            <Box key={tag.id} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography fontWeight={600} title={tag.path}>{tag.name}</Typography>
                <Typography variant="caption" color="text.secondary" component="div">
                  {tag.path !== tag.name && <>{tag.path}{tag.reason ? " · " : ""}</>}
                  {tag.reason}
                </Typography>
              </Box>
              <Tooltip title={t("aiTags.add")}>
                <span>
                  <IconButton size="small" color="success" disabled={s.working} onClick={() => s.approve([tag.id])} aria-label={t("aiTags.addNamed", { name: tag.name })}>
                    <CheckIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title={t("aiTags.dismiss")}>
                <span>
                  <IconButton size="small" disabled={s.working} onClick={() => s.dismiss([tag.id])} aria-label={t("aiTags.dismissNamed", { name: tag.name })}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
          ))}
        </Box>
      )}
    </Paper>
  );
};

export default AiTagSuggestions;
