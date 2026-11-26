import { useState } from "react";
import ReactPlayer from "react-player";
import { ThemeProvider, useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";
import IconButton from "@mui/material/IconButton";
import Slider from "@mui/material/Slider";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import PauseRoundedIcon from "@mui/icons-material/PauseRounded";
import FastRewindRoundedIcon from "@mui/icons-material/FastRewindRounded";
import FastForwardRoundedIcon from "@mui/icons-material/FastForwardRounded";
import VolumeUpRoundedIcon from "@mui/icons-material/VolumeUpRounded";
import VolumeOffRoundedIcon from "@mui/icons-material/VolumeOffRounded";
import OpenInFullRoundedIcon from "@mui/icons-material/OpenInFullRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import MoreVertRoundedIcon from "@mui/icons-material/MoreVertRounded";
import CheckIcon from "@mui/icons-material/Check";
import { useTranslation } from "react-i18next";
import CoverArt from "../MediaTile/CoverArt";
import TypeAccent from "../TypeAccent/TypeAccent";
import useNowPlayingBar from "./useNowPlayingBar";
import { SPEED_OPTIONS } from "../MediaPlayer/usePlayback";
import { formatTime } from "../../../utilities/formatTime";
import { mediaTypes, defaultCreatorName } from "../../../utilities/constant";
import { creatorDisplayName } from "../../../utilities/creatorPage";
import { useDirection, menuOrigins } from "../../../i18n/useDirection";
import { NOW_PLAYING_HEIGHT, NOW_PLAYING_VIDEO } from "../../layout/shellGeometry";
import { DOCK, NOW_PLAYING, RADIUS, SHADOW } from "../../../theme/tokens";

// The bottom player (D-145): a lesson started from the archive's hero plays in
// a bar along the foot of the screen while the reader goes on browsing — one
// row, like a music app's "now playing" bar. Mounted once, in App, so it
// survives every route change inside the shell; what is in it is the
// nowPlaying slice.
//
//   audio  the bar alone: the cover, the title and the lecturer at the start;
//          back, play, forward and the line with its times in the middle;
//          speed, volume, "open the lesson page" and close at the end.
//   video  the same bar, with the picture in a window standing on it at the
//          start corner, attached to it — the bar's buttons drive it. Below md
//          the picture plays inside the row, in the cover's place, so the dock
//          above the bar has nothing to collide with.
//
// On a phone the row keeps the cover, the title, play, a "⋯" menu (skip, speed,
// open) and close; the line runs along the bar's top edge, without its times.
//
// The bar is drawn in the lesson's type accent (TypeAccent, D-146): a recording
// in the site's blue, a video in orange. Space plays and pauses while the bar
// has the focus; Escape does nothing — closing is a button, not a key.

// A timeline runs left to right in every language (see PlayerControls).
const ltrTheme = (outer) => ({ ...outer, direction: "ltr" });

const sliderSx = {
  color: "primary.main",
  height: 4,
  "& .MuiSlider-rail": { bgcolor: "divider", opacity: 1 },
  "& .MuiSlider-track": { border: "none" },
  "& .MuiSlider-thumb": { width: 12, height: 12, boxShadow: "none" },
};

const timeSx = {
  fontSize: 13,
  fontWeight: 500,
  color: "text.secondary",
  fontVariantNumeric: "tabular-nums",
  flexShrink: 0,
};

// `closeHere`: App's word that this screen has no room for it (a live
// session's room) — the bar closes, saving where it was.
const NowPlayingBar = ({ closeHere = false }) => {
  const bar = useNowPlayingBar({ closeHere });
  if (!bar.item) return null;
  return (
    <TypeAccent type={bar.item.media_type}>
      <BarBody {...bar} />
    </TypeAccent>
  );
};

const BarBody = ({
  item, url, playerRef, playerEvents,
  playing, togglePlay, shownPosition, duration, scrub, commitScrub,
  volume, muted, handleVolumeChange, handleToggleMute,
  playbackRate, setPlaybackRate,
  skipSeconds, skipBack, skipForward, expand, close,
}) => {
  const { t } = useTranslation("media");
  const theme = useTheme();
  const mode = theme.palette.mode;
  // noSsr: the right layout on the first render, so the media element is not
  // laid out twice on a phone.
  const compact = useMediaQuery(theme.breakpoints.down("md"), { noSsr: true });
  const { end } = useDirection();
  const [speedAnchor, setSpeedAnchor] = useState(null);
  const [moreAnchor, setMoreAnchor] = useState(null);
  const isVideo = item.media_type === mediaTypes.video;
  const silent = muted || volume === 0;
  const lecturer = item.creator_name && item.creator_name !== defaultCreatorName ? creatorDisplayName(item.creator_name) : "";

  // Space plays and pauses while the bar (or its line) has the focus. A button
  // keeps Space for itself — pressing it is what Space does to a button.
  const onKeyDown = (e) => {
    if (e.key !== " ") return;
    const target = e.target;
    if (target.closest?.("button, a, [role='menuitem'], [role='menu']")) return;
    if (target.tagName === "INPUT" && target.type !== "range") return;
    e.preventDefault();
    togglePlay();
  };

  const chooseSpeed = (speed) => {
    setPlaybackRate(speed);
    setSpeedAnchor(null);
    setMoreAnchor(null);
  };

  const element = (
    <ReactPlayer
      ref={playerRef}
      url={url}
      width="100%"
      height="100%"
      controls={false}
      playing={playing}
      volume={volume}
      muted={muted}
      playbackRate={playbackRate}
      {...playerEvents}
      // An <audio> for a recording, as on the lesson page (PRD MOB-3): a phone
      // pauses a video when the screen locks.
      config={{ file: { forceAudio: !isVideo } }}
    />
  );

  const playButton = (
    <IconButton
      onClick={togglePlay}
      aria-label={playing ? t("player.pause") : t("player.play")}
      sx={{
        width: { xs: 40, md: 44 },
        height: { xs: 40, md: 44 },
        flexShrink: 0,
        bgcolor: "primary.main",
        color: "primary.contrastText",
        boxShadow: theme.palette.surface?.playGlow || SHADOW.play,
        "&:hover": { bgcolor: "primary.dark" },
        "& svg": { fontSize: 26 },
      }}
    >
      {playing ? <PauseRoundedIcon /> : <PlayArrowRoundedIcon />}
    </IconButton>
  );

  const timeline = (extraSx) => (
    <ThemeProvider theme={ltrTheme}>
      <Slider
        value={Math.min(shownPosition, duration || 0)}
        max={duration || 0}
        onChange={(_, v) => scrub(v)}
        onChangeCommitted={(_, v) => commitScrub(v)}
        aria-label={t("player.position")}
        getAriaValueText={(v) => formatTime(v)}
        size="small"
        sx={{ ...sliderSx, ...extraSx }}
      />
    </ThemeProvider>
  );

  const speedItems = SPEED_OPTIONS.map((speed) => (
    <MenuItem key={speed} selected={speed === playbackRate} onClick={() => chooseSpeed(speed)} sx={{ textAlign: "start" }}>
      <ListItemIcon>{speed === playbackRate ? <CheckIcon fontSize="small" /> : null}</ListItemIcon>
      <ListItemText primary={`${speed}X`} />
    </MenuItem>
  ));

  const iconSx = { color: "text.primary", flexShrink: 0 };

  return (
    <Box
      component="section"
      aria-label={t("bar.label")}
      data-testid="now-playing-bar"
      data-media-type={item.media_type}
      tabIndex={0}
      onKeyDown={onKeyDown}
      sx={{
        position: "fixed",
        insetInline: 0,
        bottom: 0,
        zIndex: theme.zIndex.speedDial,
        boxSizing: "content-box",
        height: { xs: `${NOW_PLAYING_HEIGHT.xs}px`, md: `${NOW_PLAYING_HEIGHT.md}px` },
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        paddingInline: { xs: 1.5, md: 3 },
        display: "flex",
        alignItems: "center",
        gap: { xs: 1, md: 2 },
        color: "text.primary",
        background: DOCK.glass[mode],
        backdropFilter: "blur(28px) saturate(180%)",
        WebkitBackdropFilter: "blur(28px) saturate(180%)",
        borderTop: `1px solid ${DOCK.edge[mode]}`,
        boxShadow: `${NOW_PLAYING.shadow}, ${DOCK.highlight[mode]}`,
        outline: "none",
        "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: "-3px" },
      }}
    >
      {/* The media element, first and in one place in both layouts, so a
          resize across md never reloads it. A recording's <audio> is an
          invisible 1×1 (as in the lesson page's card); a video's is the
          window — on the bar's top edge from md, in the row below it. */}
      {isVideo ? (
        <Box
          role="group"
          aria-label={t("bar.video")}
          data-testid="now-playing-video"
          onClick={togglePlay}
          sx={{
            position: { xs: "relative", md: "absolute" },
            bottom: { md: "100%" },
            insetInlineStart: { md: 0 },
            width: { xs: NOW_PLAYING_VIDEO.xs.width, md: NOW_PLAYING_VIDEO.md.width },
            height: { xs: NOW_PLAYING_VIDEO.xs.height, md: NOW_PLAYING_VIDEO.md.height },
            flexShrink: 0,
            overflow: "hidden",
            cursor: "pointer",
            bgcolor: "common.black",
            borderRadius: { xs: `${RADIUS.cover / 2 + 2}px`, md: "16px 16px 0 0" },
            boxShadow: { md: NOW_PLAYING.videoShadow },
            "& video": { width: "100%", height: "100%", objectFit: "contain", display: "block" },
          }}
        >
          {element}
        </Box>
      ) : (
        <Box
          data-testid="now-playing-element"
          sx={{ position: "absolute", width: "1px", height: "1px", overflow: "hidden", opacity: 0, pointerEvents: "none" }}
        >
          {element}
        </Box>
      )}

      {/* The line along the top edge, on a phone. */}
      {compact && (
        <Box sx={{ position: "absolute", top: 0, insetInline: 0, height: 0, "& .MuiSlider-root": { display: "block" } }}>
          {timeline({ p: "0 !important", height: 3, borderRadius: 0, "& .MuiSlider-thumb": { width: 10, height: 10, boxShadow: "none" } })}
        </Box>
      )}

      {/* Start: the cover, the title and the lecturer. The text opens the
          lesson's page, as the "expand" button does. */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flex: { xs: "1 1 auto", md: "1 1 0" }, minWidth: 0 }}>
        <Box
          aria-hidden
          sx={{
            display: { xs: isVideo ? "none" : "block", md: "block" },
            position: "relative",
            width: { xs: 44, md: 48 },
            height: { xs: 44, md: 48 },
            flexShrink: 0,
            borderRadius: `${RADIUS.cover}px`,
            overflow: "hidden",
            boxShadow: SHADOW.cover,
          }}
        >
          <CoverArt item={item} />
        </Box>
        <ButtonBase
          onClick={expand}
          sx={{ display: "block", minWidth: 0, textAlign: "start", borderRadius: "8px", paddingInline: 0.5 }}
        >
          <Typography dir="auto" noWrap sx={{ fontSize: { xs: 14, md: 15 }, fontWeight: 700, lineHeight: 1.3 }}>
            {item.title}
          </Typography>
          {lecturer && (
            <Typography dir="auto" noWrap sx={{ fontSize: 13, color: "text.secondary", lineHeight: 1.3 }}>
              {lecturer}
            </Typography>
          )}
        </ButtonBase>
      </Box>

      {compact ? (
        <>
          {playButton}
          <IconButton
            onClick={(e) => setMoreAnchor(e.currentTarget)}
            aria-label={t("bar.more")}
            aria-haspopup="menu"
            sx={iconSx}
          >
            <MoreVertRoundedIcon />
          </IconButton>
        </>
      ) : (
        <>
          {/* Middle: the transport and the line — left to right, as every
              timeline runs (13px times, ltr). */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flex: "2 1 0", minWidth: 0, direction: "ltr" }}>
            <IconButton onClick={skipBack} aria-label={t("bar.back", { seconds: skipSeconds })} sx={iconSx}>
              <FastRewindRoundedIcon />
            </IconButton>
            {playButton}
            <IconButton onClick={skipForward} aria-label={t("bar.forward", { seconds: skipSeconds })} sx={iconSx}>
              <FastForwardRoundedIcon />
            </IconButton>
            <Box component="span" dir="ltr" sx={{ ...timeSx, marginInlineStart: 1 }}>{formatTime(shownPosition)}</Box>
            <Box sx={{ flex: 1, minWidth: 60, display: "flex", alignItems: "center", paddingInline: 0.5 }}>
              {timeline({})}
            </Box>
            <Box component="span" dir="ltr" sx={timeSx}>{formatTime(duration)}</Box>
          </Box>

          {/* End: speed, volume, open the page. */}
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 0.5, flex: "1 1 0", minWidth: 0 }}>
            <Button
              size="small"
              onClick={(e) => setSpeedAnchor(e.currentTarget)}
              aria-label={t("bar.speedValue", { rate: playbackRate })}
              aria-haspopup="menu"
              sx={{ minWidth: 0, paddingInline: 1.25, color: "text.primary", fontVariantNumeric: "tabular-nums" }}
            >
              {`${playbackRate}X`}
            </Button>
            <IconButton
              onClick={handleToggleMute}
              aria-label={silent ? t("player.unmute") : t("player.mute")}
              aria-pressed={silent}
              sx={iconSx}
            >
              {silent ? <VolumeOffRoundedIcon /> : <VolumeUpRoundedIcon />}
            </IconButton>
            <Box sx={{ width: 88, display: { md: "none", lg: "flex" }, alignItems: "center", flexShrink: 0, paddingInline: 0.5 }}>
              <ThemeProvider theme={ltrTheme}>
                <Slider
                  value={silent ? 0 : volume}
                  min={0}
                  max={1}
                  step={0.01}
                  onChange={(_, v) => handleVolumeChange(v)}
                  aria-label={t("player.volume")}
                  getAriaValueText={(v) => `${Math.round(v * 100)}%`}
                  size="small"
                  sx={sliderSx}
                />
              </ThemeProvider>
            </Box>
            <IconButton onClick={expand} aria-label={t("bar.expand")} sx={iconSx}>
              <OpenInFullRoundedIcon />
            </IconButton>
          </Box>
        </>
      )}

      <IconButton onClick={close} aria-label={t("bar.close")} sx={iconSx}>
        <CloseRoundedIcon />
      </IconButton>

      {/* Outside every clickable box: a Menu's events bubble through the React
          tree, and the video window toggles playback on a click. */}
      <Menu
        anchorEl={speedAnchor}
        open={Boolean(speedAnchor)}
        onClose={() => setSpeedAnchor(null)}
        {...menuOrigins(end, "up")}
        slotProps={{ paper: { sx: { minWidth: 160 } } }}
      >
        {speedItems}
      </Menu>
      <Menu
        anchorEl={moreAnchor}
        open={Boolean(moreAnchor)}
        onClose={() => setMoreAnchor(null)}
        {...menuOrigins(end, "up")}
        slotProps={{ paper: { sx: { minWidth: 210 } } }}
      >
        <MenuItem onClick={() => { skipBack(); setMoreAnchor(null); }} sx={{ textAlign: "start" }}>
          <ListItemIcon><FastRewindRoundedIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary={t("bar.back", { seconds: skipSeconds })} />
        </MenuItem>
        <MenuItem onClick={() => { skipForward(); setMoreAnchor(null); }} sx={{ textAlign: "start" }}>
          <ListItemIcon><FastForwardRoundedIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary={t("bar.forward", { seconds: skipSeconds })} />
        </MenuItem>
        <Divider />
        <MenuItem disabled sx={{ opacity: "1 !important", textAlign: "start" }}>
          <ListItemText primary={t("player.speed")} primaryTypographyProps={{ variant: "caption", fontWeight: 700 }} />
        </MenuItem>
        {speedItems}
        <Divider />
        <MenuItem onClick={() => { setMoreAnchor(null); expand(); }} sx={{ textAlign: "start" }}>
          <ListItemIcon><OpenInFullRoundedIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary={t("bar.expand")} />
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default NowPlayingBar;
