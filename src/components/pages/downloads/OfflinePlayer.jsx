import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Alert from "@mui/material/Alert";
import CloseIcon from "@mui/icons-material/Close";
import { useOfflinePlayer, PLAYBACK_RATES } from "./useOfflinePlayer";
import SegmentedControl from "../../features/SegmentedControl/SegmentedControl";
import { lessonByline } from "./downloadsText";
import { RADIUS } from "../../../theme/tokens";
import { useTranslation } from "react-i18next";

// The player on the downloads page: the browser's own audio controls, which
// every phone already knows how to use, plus the speeds a lecture is usually
// heard at. See useOfflinePlayer for where it plays from.
const OfflinePlayer = ({ item, onClose }) => {
  const { t } = useTranslation("downloads");
  const { audioRef, src, missing, rate, changeRate, audioProps } = useOfflinePlayer(item);
  const byline = lessonByline(item);

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: `${RADIUS.menu}px`, borderColor: "primary.main" }}>
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, mb: 1 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" fontWeight={700} noWrap dir="auto" title={item.title}>{item.title}</Typography>
          {byline && <Typography variant="body2" color="text.secondary" noWrap>{byline}</Typography>}
        </Box>
        <Tooltip title={t("player.close")}>
          <IconButton onClick={onClose} size="small" aria-label={t("player.close")}><CloseIcon /></IconButton>
        </Tooltip>
      </Box>

      {missing ? (
        <Alert severity="warning">{t("player.missing")}</Alert>
      ) : (
        <>
          {/* LTR: the timeline runs left to right in every player, Hebrew page or not. */}
          <Box
            component="audio"
            ref={audioRef}
            src={src || undefined}
            controls
            preload="metadata"
            dir="ltr"
            sx={{ width: "100%", display: "block" }}
            {...audioProps}
          />
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1, flexWrap: "wrap" }}>
            <Typography variant="body2" color="text.secondary">{t("player.speed")}</Typography>
            <SegmentedControl
              size="small"
              semantics="radio"
              value={rate}
              onChange={changeRate}
              label={t("player.speedLabel")}
              options={PLAYBACK_RATES.map((value) => ({ value, label: `×${value}` }))}
            />
          </Box>
        </>
      )}
    </Paper>
  );
};

export default OfflinePlayer;
