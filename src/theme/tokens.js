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

// The tones a StatusBadge is drawn in (component 9).
export const badgeTones = (c) => ({
  indigo: { bg: c.accentSoft, fg: c === dark ? "#a5b4fc" : c.accent },
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
  glass: { light: "rgba(255,255,255,.55)", dark: "rgba(17,24,39,.6)" },
  edge: { light: "rgba(255,255,255,.7)", dark: "rgba(255,255,255,.08)" },
  dot: { light: "rgba(0,0,0,.55)", dark: "rgba(255,255,255,.6)" },
  shadow: "0 0 0 .5px rgba(0,0,0,.12), 0 18px 40px -8px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.8)",
  iconShadow: "0 4px 10px -2px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.35)",
  tip: "rgba(30,30,32,.82)",
  gradient: {
    archive: "linear-gradient(160deg, #818cf8, #4338ca)",
    ask: "linear-gradient(160deg, #38bdf8, #2563eb)",
    myCourses: "linear-gradient(160deg, #fb923c, #e11d48)",
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

// The sign-in family of pages (design/REDESIGN_V4.md, screens 01, 30, 31): the
// soft washes behind the card and the card's glass. The light values are the
// mockup's own; dark has no mockup — the same two washes at low strength on
// the dark page, and the card as the dark glass of the dock.
export const AUTH = {
  backdrop: {
    light:
      "radial-gradient(1200px 600px at 80% -10%, #e0e7ff 0, transparent 60%), radial-gradient(900px 500px at 0% 110%, #fde7f3 0, transparent 55%), #FBFBFD",
    dark:
      "radial-gradient(1200px 600px at 80% -10%, rgba(99,102,241,.25) 0, transparent 60%), radial-gradient(900px 500px at 0% 110%, rgba(236,72,153,.14) 0, transparent 55%), #0B0F19",
  },
  card: { light: "rgba(255,255,255,.8)", dark: "rgba(17,24,39,.8)" },
  cardEdge: { light: "#FFFFFF", dark: "rgba(255,255,255,.08)" },
  // The logo square above the title, and each provider's own colour.
  logo: "#1d1d1f",
  brands: { google: "#ea4335", apple: "#1d1d1f", linkedin: "#0a66c2" },
};
