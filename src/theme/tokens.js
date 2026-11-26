// The design tokens of Redesign v4 (design/REDESIGN_V4.md, part B), and the one
// place their values are written. theme.js turns them into a MUI theme; a
// component reads them from the theme (`surface.fill`, `theme.tokens.radius.card`)
// and never repeats a hex.
//
// Light values are the mockups' own (the shared <style> block and its
// tailwind.config). Dark has no mockup: the surfaces come from the mockups'
// `surface` colours and the text is tuned to read on them (part B, "מצב כהה").

const light = {
  bg: "#FBFBFD",
  paper: "#FFFFFF",
  ink: "#1d1d1f",
  ink2: "#424245",
  mute: "#6e6e73",
  placeholder: "#86868b",
  line: "#e8e8ed",
  lineStrong: "#d2d2d7",
  fill: "#f0f0f5",
  fillHover: "#e6e6ec",
  fill2: "#f5f5f7",
  // The selected item of a segmented control: white on the grey track.
  raised: "#FFFFFF",
  accent: "#4f46e5",
  accentHover: "#4338ca",
  accentSoft: "#eef2ff",
  // The second brand tone (tailwind brand-500): the old teal's uses — a
  // highlighted line, an outline of something chosen — in the new family.
  accentAlt: "#6366f1",
  danger: "#e11d48",
  success: { bg: "#ecfdf5", fg: "#047857", hover: "#d1fae5" },
  warning: { bg: "#fffbeb", fg: "#b45309" },
  error: { bg: "#fff1f2", fg: "#be123c" },
  // The draft badge on a cover: amber-800 on white, legible over any palette.
  draft: "#92400e",
  // The sentence playing in the transcript: the mockup's cyan-200 at 80%.
  cue: "rgba(165,243,252,.8)",
  // The empty state's wash and the glass of the header and dock.
  wash: "rgba(255,255,255,.6)",
  glass: "rgba(251,251,253,.78)",
};

const dark = {
  bg: "#0B0F19",
  paper: "#111827",
  ink: "#F5F5F7",
  ink2: "#D1D5DB",
  mute: "#9CA3AF",
  placeholder: "#7C8594",
  line: "#1E293B",
  lineStrong: "#334155",
  fill: "#1F2937",
  fillHover: "#334155",
  fill2: "#1F2937",
  raised: "#334155",
  accent: "#6366f1",
  accentHover: "#818cf8",
  accentSoft: "rgba(99,102,241,.15)",
  accentAlt: "#818cf8",
  danger: "#fb7185",
  // Badges in the dark: the colour at 15% under a light tone of itself (part B).
  success: { bg: "rgba(16,185,129,.15)", fg: "#6ee7b7", hover: "rgba(16,185,129,.25)" },
  warning: { bg: "rgba(245,158,11,.15)", fg: "#fcd34d" },
  error: { bg: "rgba(244,63,94,.15)", fg: "#fda4af" },
  draft: "#92400e",
  // Cyan-400 at 28%: a wash the light text still reads on.
  cue: "rgba(34,211,238,.28)",
  wash: "rgba(17,24,39,.6)",
  glass: "rgba(11,15,25,.78)",
};

export const COLORS = { light, dark };

// White that stays white in both modes: text over a photo or a gradient, the
// sheet of a PDF page. (`paper` turns dark in the dark mode, which these must not.)
export const WHITE = "#FFFFFF";

// The live room's chrome. A video room is dark in either mode — the picture of
// a camera reads on a dark stage — so it takes the dark palette whole rather
// than the mode's own (the bars, the chat, the controls).
export const ROOM = {
  stage: dark.bg,
  bar: dark.paper,
  line: dark.line,
  fill: dark.fill,
  fillHover: dark.fillHover,
  ink: dark.ink,
  ink2: dark.ink2,
  mute: dark.mute,
  placeholder: dark.placeholder,
  danger: dark.danger,
  dangerSoft: "rgba(251,113,133,.15)",
  dangerSoftHover: "rgba(251,113,133,.25)",
  // The name tag over a tile.
  label: "rgba(0,0,0,.5)",
};

// The accent of each kind of content (polish run, D-146): the player's control
// bar and the lesson's tabs card are drawn in it, and so is the bottom player
// (D-145). Audio is the site's own accent, value for value, so nothing changes
// for a recording; a video is orange, a book purple.
//
// `main` carries white text in the light mode — #c2410c is orange-700, because
// the asked-for orange-600 (#ea580c) gives white only 3.6:1 and 4.5 is the
// floor; violet-600 gives 5.7:1 as it is. The dark mode's shades are light ones
// that read on a dark card, and white on them would be 2.3–2.7:1, so their
// text is the dark page's ink (8.4:1 and 7:1). `glow` is the play button's
// shadow, in the same colour.
const accentOf = (c, contrastText, glow) => ({
  main: c.accent, hover: c.accentHover, soft: c.accentSoft, alt: c.accentAlt, contrastText, glow,
});
export const TYPE_ACCENT = {
  audio: {
    light: accentOf(light, WHITE, "0 6px 16px rgba(79,70,229,.4)"),
    dark: accentOf(dark, WHITE, "0 6px 16px rgba(79,70,229,.4)"),
  },
  video: {
    light: { main: "#c2410c", hover: "#9a3412", soft: "#fff7ed", alt: "#ea580c", contrastText: WHITE, glow: "0 6px 16px rgba(194,65,12,.38)", badgeFg: "#c2410c" },
    dark: { main: "#fb923c", hover: "#fdba74", soft: "rgba(251,146,60,.15)", alt: "#fdba74", contrastText: dark.bg, glow: "0 6px 16px rgba(251,146,60,.3)", badgeFg: "#fdba74" },
  },
  text: {
    light: { main: "#7c3aed", hover: "#6d28d9", soft: "#f5f3ff", alt: "#8b5cf6", contrastText: WHITE, glow: "0 6px 16px rgba(124,58,237,.38)", badgeFg: "#7c3aed" },
    dark: { main: "#a78bfa", hover: "#c4b5fd", soft: "rgba(167,139,250,.15)", alt: "#c4b5fd", contrastText: dark.bg, glow: "0 6px 16px rgba(167,139,250,.3)", badgeFg: "#c4b5fd" },
  },
};

// The tones a StatusBadge is drawn in (component 9). `isDark` is passed rather
// than read off `c`, because a type's accent (TYPE_ACCENT) builds its own copy
// of the palette.
export const badgeTones = (c, isDark = c === dark) => ({
  indigo: { bg: c.accentSoft, fg: c.badgeFg || (isDark ? "#a5b4fc" : c.accent) },
  neutral: { bg: c.fill, fg: c.ink2 },
  success: { bg: c.success.bg, fg: c.success.fg },
  warning: { bg: c.warning.bg, fg: c.warning.fg },
  error: { bg: c.error.bg, fg: c.error.fg },
});

// Radii in px (part B, "רדיוסים"). Written as numbers or strings in sx —
// never as a bare small number, which MUI multiplies by shape.borderRadius.
export const RADIUS = {
  pill: 999,
  cover: 10,
  tile: 14,
  field: 14,
  menu: 16,
  emptyIcon: 18,
  viewer: 20,
  card: 24,
  hero: 28,
  auth: 32,
};

// Shadows (part B, "צללים").
export const SHADOW = {
  card: "0 1px 2px rgba(0,0,0,.03)",
  sm: "0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.04)",
  cover: "0 1px 2px rgba(0,0,0,.08), 0 8px 24px -8px rgba(0,0,0,.25)",
  coverHover: "0 2px 4px rgba(0,0,0,.08), 0 18px 36px -10px rgba(0,0,0,.35)",
  menu: "0 20px 50px -12px rgba(0,0,0,.25)",
  auth: "0 30px 80px -20px rgba(79,70,229,.25)",
  player: "0 20px 60px -20px rgba(0,0,0,.4)",
  chatInput: "0 10px 40px -12px rgba(0,0,0,.25)",
  dialog: "0 30px 80px -20px rgba(0,0,0,.3)",
  play: "0 6px 16px rgba(79,70,229,.4)",
};

// The card shell (component 12) — paper, a 1px line, radius 24, the card
// shadow — spread into every `sx` that draws a card of its own. SectionCard,
// NoteCard, the player card and the admin cards all start from it.
export const CARD_SHELL_SX = {
  bgcolor: "background.paper",
  border: 1,
  borderColor: "divider",
  borderRadius: `${RADIUS.card}px`,
  boxShadow: SHADOW.card,
};

// Motion (part B, "תנועה").
export const MOTION = {
  cover: ".35s cubic-bezier(.2,.8,.2,1)",
  dock: ".22s cubic-bezier(.3,1.4,.5,1)",
  press: "scale(.95)",
};

// Assistant for text, Heebo for display headings (part A, "פונטים"; D-27).
// Heebo is second in the text stack on purpose: Assistant has no Yiddish
// ligatures (װ ױ ײ, U+05F0–05F2) and no FB1D/FB1F/FB4C, and the browser takes
// those glyphs from the next font that has them. Segoe UI and Arial catch the
// marks neither font draws (meteg U+05BD, the upper and lower dots U+05C4–05C5).
export const FONT_TEXT = '"Assistant", "Heebo", "Segoe UI", Arial, sans-serif';
export const FONT_DISPLAY = '"Heebo", "Assistant", "Segoe UI", Arial, sans-serif';

// The mockups' width limits (part B, "Layout"; decision 7).
export const CONTENT_WIDTH = { wide: 1180, narrow: 1080 };

// The dock (component 4): its glass, and the gradient of each of its icons.
export const DOCK = {
  // A soft silver glass (polish run): a gentle top-to-bottom gradient that still
  // melts into a white page. Dark keeps a dark glass with a faint cool sheen.
  glass: {
    light: "linear-gradient(180deg, rgba(250,251,253,.74) 0%, rgba(229,232,238,.66) 100%)",
    dark: "linear-gradient(180deg, rgba(34,42,60,.66) 0%, rgba(17,24,39,.62) 100%)",
  },
  edge: { light: "rgba(255,255,255,.75)", dark: "rgba(255,255,255,.1)" },
  // The inner top highlight, laid over the drop shadow.
  highlight: { light: "inset 0 1px 0 rgba(255,255,255,.85)", dark: "inset 0 1px 0 rgba(255,255,255,.12)" },
  // The bar's side padding: about double the old 14px / 12px; top and bottom unchanged.
  paddingInline: { xs: 24, md: 30 },
  dot: { light: "rgba(0,0,0,.55)", dark: "rgba(255,255,255,.6)" },
  shadow: "0 0 0 .5px rgba(0,0,0,.12), 0 18px 40px -8px rgba(0,0,0,.28)",
  iconShadow: "0 4px 10px -2px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.35)",
  tip: "rgba(30,30,32,.82)",
  gradient: {
    archive: "linear-gradient(160deg, #818cf8, #4338ca)",
    ask: "linear-gradient(160deg, #38bdf8, #2563eb)",
    myCourses: "linear-gradient(160deg, #fb923c, #e11d48)",
    notebook: "linear-gradient(160deg, #34d399, #047857)",
  },
};

// The header's hairline (component 1), and the drawer's avatar and backdrop
// (component 3).
export const SHELL = {
  headerEdge: { light: "rgba(0,0,0,.08)", dark: "rgba(255,255,255,.08)" },
  drawerAvatar: "linear-gradient(135deg, #6366f1, #312e81)",
  drawerShadow: "0 0 80px rgba(0,0,0,.3)",
  backdrop: "rgba(0,0,0,.25)",
};

// The item tile (component 5): the round buttons and the badge that sit ON a
// cover. White in both modes — they are read against the cover's own colours,
// not against the page — and the heart is the light mode's rose for the same
// reason. The hero (decision 1) is the archive's indigo banner.
export const TILE = {
  fab: "rgba(255,255,255,.9)",
  fabInk: "#1d1d1f",
  fabShadow: "0 1px 3px rgba(0,0,0,.15)",
  heart: "#e11d48",
  badge: "rgba(255,255,255,.92)",
  gap: { column: { xs: 2, md: 4 }, row: { xs: 4, md: 6 } },
};

export const HERO = {
  base: "#14123a",
  gradient: ["#4f46e5", "#2b2a7a", "#14123a"],
  ring: "rgba(255,255,255,.10)",
  kicker: "#c7d2fe",
  text: "rgba(224,231,255,.8)",
  ghost: "rgba(255,255,255,.15)",
  ghostHover: "rgba(255,255,255,.25)",
};


// The bottom player (D-145): the dock's glass, stretched along the screen's
// foot, with its shadow cast upwards; the docked video window over it.
export const NOW_PLAYING = {
  shadow: "0 -10px 30px -14px rgba(0,0,0,.28)",
  videoShadow: "0 -8px 24px -10px rgba(0,0,0,.35)",
};
