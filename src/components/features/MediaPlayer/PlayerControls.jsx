import { useEffect, useRef, useState } from "react";
import { ThemeProvider, useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Slider from "@mui/material/Slider";
import Popper from "@mui/material/Popper";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Divider from "@mui/material/Divider";
import Tooltip from "@mui/material/Tooltip";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import VolumeDownIcon from "@mui/icons-material/VolumeDown";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import SettingsIcon from "@mui/icons-material/Settings";
import CheckIcon from "@mui/icons-material/Check";
import SpeedIcon from "@mui/icons-material/Speed";
import ClosedCaptionIcon from "@mui/icons-material/ClosedCaption";
import ClosedCaptionOffOutlinedIcon from "@mui/icons-material/ClosedCaptionOffOutlined";
import { alpha } from "@mui/material/styles";
import { useDownloadItems } from "../DownloadMenu/downloadOptions";
import { formatTime } from "../../../utilities/formatTime";
import { useDirection, menuOrigins } from "../../../i18n/useDirection";
import { SHADOW } from "../../../theme/tokens";
import { useTranslation } from "react-i18next";

const SPEED_OPTIONS = [0.5, 1, 1.5, 2];

// The player's controls, in one of two shapes (D-21, D-94):
//
//   "overlay" — the brushed-glass bar that floats over a video's picture.
//   "card"    — an audio lecture's player card under its cover (Redesign v4,
//               screen 20): a round 56px play button, a 6px progress line with
//               the times under it, and a compact row of 36px icon buttons for
//               volume, captions and the settings menu.
//
// One component for both, so speed, the downloads in the settings menu, the
// volume panel and captions are written once and the two shapes cannot drift.
//
// The native controls had to go: the requirement is a settings menu carrying
// our playback speed and our download links, and the browser's menu is the
// browser's — no page can add entries to it. Everything the native bar gave for
// free is therefore re-provided on purpose: real <button>s so tab and Enter
// work, MUI Sliders for scrub and volume (arrow keys, announced values) and
// labelled controls throughout.
//
// The overlay keeps fixed light-glass colours rather than palette ones: over
// video it sits on top of black, so it must NOT follow the app's light/dark
// theme — a bar that went dark in dark mode would disappear into the picture.
// The card stands on the page, so it follows the theme like any other card.
//
// The played portion is the accent in both (Redesign v4, part B). It used to
// take the media type's colour from mediaTypeAccents; the new design has one
// accent, and the cover art already says what kind of lesson this is.
const BAR_INK = "#1c1c1e";

const barSurface = {
  bgcolor: "rgba(233, 233, 238, 0.55)",
  border: "1px solid rgba(255,255,255,0.45)",
  boxShadow: "0 6px 22px rgba(0,0,0,0.4)",
};

// The silver bevelled knob of the overlay bar. Shared by both of its sliders so
// the scrub bar and the volume bar are visibly the same instrument — including
// the halo, which is derived from the accent rather than hard-coded.
const knobSx = (accent) => ({
  backgroundImage: "linear-gradient(180deg, #ffffff 0%, #dcdcdf 100%)",
  border: "1px solid rgba(0,0,0,0.28)",
  boxShadow: "0 1px 2px rgba(0,0,0,0.4)",
  "&:hover, &.Mui-focusVisible": {
    boxShadow: `0 0 0 7px ${alpha(accent, 0.22)}, 0 1px 2px rgba(0,0,0,0.4)`,
  },
  "&.Mui-active": {
    boxShadow: `0 0 0 10px ${alpha(accent, 0.28)}, 0 1px 2px rgba(0,0,0,0.4)`,
  },
});

// The card's line: 6px, the track in `line`, the fill in the accent. The thumb
// is small and only grows a halo under the hand — it is there to be dragged and
// focused, not to be looked at.
const cardSliderSx = (accent) => ({
  color: accent,
  height: 6,
  py: 1,
  "& .MuiSlider-rail": { bgcolor: "divider", opacity: 1 },
  "& .MuiSlider-track": { border: "none" },
  "& .MuiSlider-thumb": {
    width: 12,
    height: 12,
    bgcolor: accent,
    boxShadow: "none",
    "&:hover, &.Mui-focusVisible": { boxShadow: `0 0 0 6px ${alpha(accent, 0.18)}` },
    "&.Mui-active": { boxShadow: `0 0 0 8px ${alpha(accent, 0.24)}` },
  },
});

const PlayerControls = ({
  playing, onTogglePlay,
  volume, muted, onVolumeChange, onToggleMute,
  played, duration, onSeek, onSeekCommit,
  playbackRate, onRateChange,
  media, transcript,
  variant = "overlay",
  onBusyChange,
  // PRD MOB-5. The button is there only when the lesson has captions to show.
  captionsAvailable = false, captionsOn = false, onToggleCaptions,
}) => {
  const { t } = useTranslation("media");
  const theme = useTheme();
  const accent = theme.palette.primary.main;
  const card = variant === "card";
  // The settings menu sits outside the sliders' forced-ltr theme, so it
  // follows the interface: it opens from the side its button's line starts on.
  const { start } = useDirection();
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [volumeAnchor, setVolumeAnchor] = useState(null);
  const closeMenu = () => setMenuAnchor(null);

  // The same entries the download pill offers, built from one place — see
  // downloadOptions.jsx. This menu used to list its own, and the transcript PDF
  // that was added to the other one never reached it.
  const downloadItems = useDownloadItems({ media, transcript, onClose: closeMenu });

  // ── Keeping the volume panel under the pointer ─────────────────────────────
  //
  // The panel opens on hover and closes when the pointer leaves the speaker
  // area. Two things used to close it out from under the user mid-adjustment:
  // the gap it floated above (crossing it counted as leaving), and dragging the
  // knob far enough sideways to take the pointer outside the panel — which
  // unmounted the slider the drag was still holding.
  //
  // The gap is gone (offset 0, so the panel touches the button), and a drag is
  // now explicitly a state of its own: while the knob is held, leaving does not
  // close. Release decides — the panel stays only if the pointer came back to
  // the speaker area, which `areaRef` is here to answer.
  const areaRef = useRef(null);
  const [draggingVolume, setDraggingVolume] = useState(false);

  useEffect(() => {
    if (!draggingVolume) return;
    const end = (e) => {
      setDraggingVolume(false);
      if (!areaRef.current?.contains(e.target)) setVolumeAnchor(null);
    };
    window.addEventListener("pointerup", end);
    return () => window.removeEventListener("pointerup", end);
  }, [draggingVolume]);

  // Over a video the bar fades out while playing, and that must not happen with
  // the settings menu or the volume slider open under the user's hand. Those
  // live here, so this is the only place that knows — reported upwards rather
  // than guessed at by the player, which would have to watch for portals it does
  // not own. Effect rather than a call inside the setters, so closing by any
  // route (Escape, a click away, choosing a speed) is covered by construction.
  const busy = Boolean(menuAnchor || volumeAnchor || draggingVolume);
  useEffect(() => { onBusyChange?.(busy); }, [busy, onBusyChange]);

  const silent = muted || volume === 0;
  const VolumeIcon = silent ? VolumeOffIcon : volume < 0.5 ? VolumeDownIcon : VolumeUpIcon;

  // The secondary buttons: dark ink on the overlay's light glass, the page's
  // muted ink on the card, where they are a quiet row under the line.
  const iconSx = card
    ? { color: "text.secondary", width: 36, height: 36, flexShrink: 0 }
    : { color: BAR_INK, flexShrink: 0 };

  // Slider reads its direction from the THEME (useRtl → RtlProvider, which
  // MUI's ThemeProvider feeds from theme.direction), not from CSS or a dir
  // attribute. A timeline runs left to right in every language — the elapsed
  // portion fills from the left and the head travels right — so the sliders sit
  // in a forced-ltr theme; without it they would fill from the right in Hebrew
  // AND invert their pointer maths, so dragging right would rewind.
  const ltrTheme = (outer) => ({ ...outer, direction: "ltr" });

  const playButton = (
    <IconButton
      onClick={onTogglePlay}
      size={card ? "large" : "small"}
      aria-label={playing ? t("player.pause") : t("player.play")}
      sx={card
        ? {
            width: 56,
            height: 56,
            flexShrink: 0,
            bgcolor: "primary.main",
            color: "primary.contrastText",
            // In the accent's own colour (D-146): the indigo glow under an
            // orange button read as a mistake.
            boxShadow: theme.palette.surface?.playGlow || SHADOW.play,
            "&:hover": { bgcolor: "primary.dark" },
            "& svg": { fontSize: 28 },
          }
        : { color: BAR_INK, flexShrink: 0 }}
    >
      {playing ? <PauseIcon /> : <PlayArrowIcon />}
    </IconButton>
  );

  const timeline = (
    <Slider
      value={Math.min(played, duration || 0)}
      max={duration || 0}
      onChange={(_, v) => onSeek(v)}
      onChangeCommitted={(_, v) => onSeekCommit(v)}
      aria-label={t("player.position")}
      getAriaValueText={(v) => formatTime(v)}
      size="small"
      sx={card
        ? cardSliderSx(accent)
        : {
            mx: 1,
            color: accent,
            height: 5,
            "& .MuiSlider-rail": { bgcolor: "rgba(0,0,0,0.30)", opacity: 1 },
            "& .MuiSlider-track": { border: "none" },
            "& .MuiSlider-thumb": { width: 15, height: 15, ...knobSx(accent) },
          }}
    />
  );

  const volumeArea = (
    <Box
      ref={areaRef}
      onMouseEnter={(e) => setVolumeAnchor(e.currentTarget)}
      // Not while the knob is being dragged: the pointer leaving the panel
      // mid-drag is normal, and closing then would take the slider away
      // from a hand that is still holding it.
      onMouseLeave={() => { if (!draggingVolume) setVolumeAnchor(null); }}
      sx={{ flexShrink: 0, display: "flex", alignItems: "center" }}
    >
      <IconButton
        onClick={onToggleMute}
        size="small"
        aria-label={silent ? t("player.unmute") : t("player.mute")}
        aria-pressed={silent}
        sx={iconSx}
      >
        <VolumeIcon />
      </IconButton>

      {/* Rises out of the speaker on hover. disablePortal keeps it a DOM
          child of the hover area — portalled to <body> it would count as
          leaving the button, and the panel would close the instant the
          pointer set off towards it.
          Offset 0 for the same reason: it used to float 6px above the
          button, and that strip belonged to neither, so the pointer on its
          way up to the slider left the hover area and the panel vanished
          before it could be touched. Sitting flush on the speaker, there is
          nothing to cross. */}
      <Popper
        open={Boolean(volumeAnchor)}
        anchorEl={volumeAnchor}
        placement="top"
        disablePortal
        modifiers={[{ name: "offset", options: { offset: [0, 0] } }]}
        style={{ zIndex: 2 }}
      >
        <Paper
          elevation={6}
          sx={card
            ? { px: 0.5, py: 1.25, display: "flex", justifyContent: "center", borderRadius: 2 }
            : {
                px: 0.5, py: 1.25,
                display: "flex", justifyContent: "center",
                borderRadius: 2,
                bgcolor: "rgba(233, 233, 238, 0.92)",
                backdropFilter: "blur(24px) saturate(180%)",
              }}
        >
          <Slider
            orientation="vertical"
            value={silent ? 0 : volume}
            min={0}
            max={1}
            step={0.01}
            onChange={(_, v) => onVolumeChange(v)}
            onPointerDown={() => setDraggingVolume(true)}
            aria-label={t("player.volume")}
            getAriaValueText={(v) => `${Math.round(v * 100)}%`}
            size="small"
            sx={card
              ? { ...cardSliderSx(accent), height: 90, width: 6, py: 0, px: 1 }
              : {
                  height: 90,
                  color: accent,
                  "& .MuiSlider-rail": { bgcolor: "rgba(0,0,0,0.30)", opacity: 1 },
                  "& .MuiSlider-track": { border: "none" },
                  "& .MuiSlider-thumb": { width: 14, height: 14, ...knobSx(accent) },
                }}
          />
        </Paper>
      </Popper>
    </Box>
  );

  const captionsButton = captionsAvailable && (
    <Tooltip title={captionsOn ? t("player.hideCaptions") : t("player.showCaptions")}>
      <IconButton
        onClick={onToggleCaptions}
        size="small"
        aria-label={t("player.captions")}
        aria-pressed={captionsOn}
        sx={{ ...iconSx, ...(card && captionsOn && { color: "primary.main" }) }}
      >
        {captionsOn ? <ClosedCaptionIcon /> : <ClosedCaptionOffOutlinedIcon />}
      </IconButton>
    </Tooltip>
  );

  const settingsButton = (
    <Tooltip title={t("player.settings")}>
      <IconButton
        onClick={(e) => setMenuAnchor(e.currentTarget)}
        size="small"
        aria-label={t("player.settingsLabel")}
        aria-haspopup="menu"
        sx={iconSx}
      >
        <SettingsIcon />
      </IconButton>
    </Tooltip>
  );

  const settingsMenu = (
    <Menu
      anchorEl={menuAnchor}
      open={Boolean(menuAnchor)}
      onClose={closeMenu}
      {...menuOrigins(start, "up")}
      slotProps={{ paper: { sx: { minWidth: 210 } } }}
    >
      <MenuItem disabled sx={{ opacity: "1 !important" }}>
        <ListItemIcon><SpeedIcon fontSize="small" /></ListItemIcon>
        <ListItemText
          primary={t("player.speed")}
          primaryTypographyProps={{ variant: "caption", fontWeight: 700 }}
          sx={{ textAlign: "start" }}
        />
      </MenuItem>

      {SPEED_OPTIONS.map((speed) => (
        <MenuItem
          key={speed}
          selected={speed === playbackRate}
          onClick={() => { onRateChange(speed); closeMenu(); }}
          sx={{ textAlign: "start" }}
        >
          {/* The tick occupies the icon slot whether or not it is showing, so
              the labels stay on one vertical line as the choice moves. */}
          <ListItemIcon>
            {speed === playbackRate ? <CheckIcon fontSize="small" /> : null}
          </ListItemIcon>
          <ListItemText primary={`${speed}X`} />
        </MenuItem>
      ))}

      <Divider />

      {/* The download entries, spread rather than wrapped: MUI's MenuList
          walks its own children, so a component around them would hide them
          from its keyboard handling. */}
      {downloadItems}
    </Menu>
  );

  if (card) {
    // Play leads the row in the reader's direction (the mockup's), while the
    // line and its times run left to right as every timeline does — the times
    // are `dir="ltr"` in the mockup too.
    return (
      <Box data-testid="player-controls">
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          {playButton}
          <Box sx={{ flex: 1, minWidth: 0, direction: "ltr" }}>
            <ThemeProvider theme={ltrTheme}>{timeline}</ThemeProvider>
            {/* Tabular figures so the line does not twitch sideways every
                time the seconds tick over. */}
            <Box
              dir="ltr"
              sx={{
                display: "flex",
                justifyContent: "space-between",
                mt: 0.25,
                fontSize: 13,
                fontWeight: 500,
                color: "text.secondary",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              <span>{formatTime(played)}</span>
              <span>{formatTime(duration)}</span>
            </Box>
          </Box>
        </Box>
        <Box sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 0.5, mt: 1 }}>
          <ThemeProvider theme={ltrTheme}>{volumeArea}</ThemeProvider>
          {captionsButton}
          {settingsButton}
        </Box>
        {settingsMenu}
      </Box>
    );
  }

  return (
    <Box
      data-testid="player-controls"
      sx={{
        display: "flex", alignItems: "center", gap: 0.5,
        // The one strip in this Hebrew app that stays left-to-right. A media
        // bar is a picture of a TIMELINE, not a line of text: play sits at the
        // start, the elapsed portion fills from the start, and the head travels
        // towards the end.
        direction: "ltr",
        // Above the media element, which is absolutely positioned behind it.
        position: "relative", zIndex: 1,
        width: "100%", maxWidth: 720,
        px: 1, py: 0.5,
        borderRadius: 2,
        color: BAR_INK,
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
        ...barSurface,
      }}
    >
      {playButton}

      {/* Tabular figures so the bar does not twitch sideways every time the
          seconds tick over. */}
      <Typography
        variant="caption"
        sx={{ flexShrink: 0, fontVariantNumeric: "tabular-nums", opacity: 0.75 }}
      >
        {`${formatTime(played)} / ${formatTime(duration)}`}
      </Typography>

      {/* Scoped so the menu below stays in the interface's direction. */}
      <ThemeProvider theme={ltrTheme}>
        {timeline}
        {volumeArea}
      </ThemeProvider>

      {captionsButton}
      {settingsButton}
      {settingsMenu}
    </Box>
  );
};

export default PlayerControls;
