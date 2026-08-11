import { useEffect, useRef, useState } from "react";
import { ThemeProvider } from "@mui/material/styles";
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
import { alpha } from "@mui/material/styles";
import { useDownloadItems } from "../DownloadMenu/downloadOptions";
import { mediaTypeAccents } from "../../../utilities/constant";
import { formatTime } from "../../../utilities/formatTime";

const SPEED_OPTIONS = [0.5, 1, 1.5, 2];

// Brushed-glass bar in place of the browser's own controls.
//
// The native controls had to go: the requirement is a settings menu carrying
// our playback speed and our download links, and the browser's menu is the
// browser's — no page can add entries to it. Everything the native bar gave for
// free is therefore re-provided on purpose: real <button>s so tab and Enter
// work, MUI Sliders for scrub and volume (arrow keys, announced values) and
// labelled controls throughout.
//
// Fixed light-glass colours rather than palette ones: over video this sits on
// top of black, so it must NOT follow the app's light/dark theme — a bar that
// went dark in dark mode would disappear into the picture behind it.
//
// An audio lecture has no picture and therefore no black to sit on; the bar
// stands directly on the page. The ink stays dark either way — it is a light
// bar — but the surface behind it cannot: at 55% opacity over a dark page the
// glass turns muddy and takes the contrast of the dark ink down with it. So the
// two states below differ in exactly the three properties that assumed black:
// how solid the fill is, how bright the edge is, and how heavy the drop shadow.
// The played portion of the bar takes the colour of the MEDIA TYPE, from the
// same mediaTypeAccents the archive card paints its corner brackets and its
// placeholder icon with — so a video is the same orange wherever it appears, by
// reading one value rather than by two files happening to agree on a hex.
// It was a fixed blue, which said "video" on a video and "video" on a book too.
const accentFor = (mediaType) => mediaTypeAccents[mediaType] || mediaTypeAccents.text;

const BAR_INK = "#1c1c1e";

const barSurface = (overPicture) => (overPicture
  ? {
      bgcolor: "rgba(233, 233, 238, 0.55)",
      border: "1px solid rgba(255,255,255,0.45)",
      boxShadow: "0 6px 22px rgba(0,0,0,0.4)",
    }
  : {
      bgcolor: "rgba(233, 233, 238, 0.95)",
      border: "1px solid rgba(0,0,0,0.12)",
      boxShadow: "0 1px 6px rgba(0,0,0,0.18)",
    });

// The silver bevelled knob from the reference design. Shared by both sliders so
// the scrub bar and the volume bar are visibly the same instrument — including
// the halo, which is derived from the accent rather than hard-coded, or the two
// would drift apart the moment a media type stopped being blue.
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

const PlayerControls = ({
  playing, onTogglePlay,
  volume, muted, onVolumeChange, onToggleMute,
  played, duration, onSeek, onSeekCommit,
  playbackRate, onRateChange,
  media, transcript,
  overPicture = true,
  onBusyChange,
}) => {
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

  const mediaType = media?.media_type;
  const accent = accentFor(mediaType);
  const silent = muted || volume === 0;
  const VolumeIcon = silent ? VolumeOffIcon : volume < 0.5 ? VolumeDownIcon : VolumeUpIcon;

  return (
    <Box
      sx={{
        display: "flex", alignItems: "center", gap: 0.5,
        // The one strip in this Hebrew app that stays left-to-right. A media
        // bar is a picture of a TIMELINE, not a line of text: play sits at the
        // start, the elapsed portion fills from the start, and the head travels
        // towards the end. The page's RTL was mirroring the whole row, which put
        // play on the right and ran the progress backwards — the opposite of
        // what every other player the user has ever touched does.
        direction: "ltr",
        // Above the media element, which is absolutely positioned behind it.
        position: "relative", zIndex: 1,
        width: "100%", maxWidth: 720,
        px: 1, py: 0.5,
        borderRadius: 2,
        color: BAR_INK,
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
        ...barSurface(overPicture),
      }}
    >
      <IconButton
        onClick={onTogglePlay}
        size="small"
        aria-label={playing ? "השהיה" : "נגינה"}
        sx={{ color: BAR_INK, flexShrink: 0 }}
      >
        {playing ? <PauseIcon /> : <PlayArrowIcon />}
      </IconButton>

      {/* Tabular figures so the bar does not twitch sideways every time the
          seconds tick over. */}
      <Typography
        variant="caption"
        sx={{ flexShrink: 0, fontVariantNumeric: "tabular-nums", opacity: 0.75 }}
      >
        {`${formatTime(played)} / ${formatTime(duration)}`}
      </Typography>

      {/* Slider reads its direction from the THEME (useRtl → RtlProvider, which
          MUI's ThemeProvider feeds from theme.direction), not from CSS or a dir
          attribute. The `direction: ltr` above therefore fixes only how the row
          is laid out; without this override the sliders would still fill from
          the right AND invert their pointer maths, so dragging right would
          rewind. Scoped here so the menu below stays Hebrew-RTL. */}
      <ThemeProvider theme={(outer) => ({ ...outer, direction: "ltr" })}>
        <Slider
          value={Math.min(played, duration || 0)}
          max={duration || 0}
          onChange={(_, v) => onSeek(v)}
          onChangeCommitted={(_, v) => onSeekCommit(v)}
          aria-label="מיקום בשיעור"
          getAriaValueText={(v) => formatTime(v)}
          size="small"
          sx={{
            mx: 1,
            color: accent,
            height: 5,
            "& .MuiSlider-rail": { bgcolor: "rgba(0,0,0,0.30)", opacity: 1 },
            "& .MuiSlider-track": { border: "none" },
            "& .MuiSlider-thumb": { width: 15, height: 15, ...knobSx(accent) },
          }}
        />

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
            aria-label={silent ? "ביטול השתקה" : "השתקה"}
            aria-pressed={silent}
            sx={{ color: BAR_INK }}
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
              sx={{
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
                aria-label="עוצמת שמע"
                getAriaValueText={(v) => `${Math.round(v * 100)}%`}
                size="small"
                sx={{
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
      </ThemeProvider>

      <Tooltip title="הגדרות">
        <IconButton
          onClick={(e) => setMenuAnchor(e.currentTarget)}
          size="small"
          aria-label="הגדרות נגן"
          aria-haspopup="menu"
          sx={{ color: BAR_INK, flexShrink: 0 }}
        >
          <SettingsIcon />
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={closeMenu}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        transformOrigin={{ vertical: "bottom", horizontal: "right" }}
        slotProps={{ paper: { sx: { minWidth: 210 } } }}
      >
        <MenuItem disabled sx={{ opacity: "1 !important" }}>
          <ListItemIcon><SpeedIcon fontSize="small" /></ListItemIcon>
          <ListItemText
            primary="מהירות הפעלה"
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
    </Box>
  );
};

export default PlayerControls;
