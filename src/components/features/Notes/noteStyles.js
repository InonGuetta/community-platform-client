// Redesign v4 (screen 05): a source reference in the notebook — the button
// naming the lecture a note was taken on, and every source chip written into a
// note's body — is a green chip (part B: success = "הפניות למקור במחברת"). One
// definition, so the two cannot drift apart.
export const SOURCE_CHIP_SX = {
  bgcolor: "badge.success.bg",
  color: "badge.success.fg",
  fontWeight: 600,
  // Darkened rather than switched to a second shade: a badge tone has no hover
  // colour of its own.
  "&:hover": { bgcolor: "badge.success.bg", filter: "brightness(0.95)" },
};
