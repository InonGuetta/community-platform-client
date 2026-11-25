import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import CircularProgress from "@mui/material/CircularProgress";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import useAiTagSuggestions from "../useAiTagSuggestions";
import { RADIUS } from "../../../../theme/tokens";
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
    <Box sx={{ mt: 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5, flexWrap: "wrap" }}>
        <AutoAwesomeOutlinedIcon fontSize="small" color="secondary" />
        <Typography variant="h6" component="h4" sx={{ fontWeight: 800, fontSize: 18, flex: 1 }}>{t("aiTags.title")}</Typography>
        {s.working && <CircularProgress size={18} />}
        {s.suggestions.length === 0 && canRequest && (
          <Button size="small" variant="outlined" disabled={s.working} onClick={s.request}>{t("aiTags.request")}</Button>
        )}
      </Box>

      {/* The mockup's fill-2 box: the proposals, and "accept all" / "dismiss
          all" at the end of it. Each proposal keeps its own accept / dismiss. */}
      <Box sx={{ borderRadius: `${RADIUS.menu}px`, bgcolor: "surface.fill2", p: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
        {s.suggestions.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {t("aiTags.none")}
          </Typography>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
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
        {s.suggestions.length > 1 && (
          <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end", flexWrap: "wrap" }}>
            <Button size="small" variant="dark" disabled={s.working} onClick={() => s.approve(ids)}>{t("aiTags.approveAll")}</Button>
            <Button size="small" variant="soft" disabled={s.working} onClick={() => s.dismiss(null)}>{t("aiTags.dismissAll")}</Button>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default AiTagSuggestions;
