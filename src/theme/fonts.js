// The two typefaces of Redesign v4 (part A, "פונטים"; D-27), served from the
// app's own bundle (@fontsource) rather than a font CDN.
//
// Each file below declares its faces with a unicode-range, so a browser
// downloads only the subsets the page actually draws.
//
// Assistant — all text — in the weights the design uses, with its Hebrew,
// Latin and Latin Extended subsets: Hebrew and Yiddish letters and points,
// and every letter French and Spanish need.
import "@fontsource/assistant/400.css";
import "@fontsource/assistant/500.css";
import "@fontsource/assistant/600.css";
import "@fontsource/assistant/700.css";
import "@fontsource/assistant/800.css";
// Heebo — display headings (800) in every script. And, in Hebrew only, at the
// text weights too: Assistant has no Yiddish ligatures (װ ױ ײ) nor the
// precomposed ײַ, and the text stack (tokens.js FONT_TEXT) takes them from
// Heebo, at the weight of the text around them.
import "@fontsource/heebo/hebrew-400.css";
import "@fontsource/heebo/hebrew-500.css";
import "@fontsource/heebo/hebrew-600.css";
import "@fontsource/heebo/hebrew-700.css";
import "@fontsource/heebo/hebrew-800.css";
import "@fontsource/heebo/latin-800.css";
import "@fontsource/heebo/latin-ext-800.css";
