// First few words of a longer text, for somewhere only one line fits.
//
// Words rather than characters: a character cut lands mid-word and reads as a
// typo. Whitespace is collapsed on the way through, so a note written across
// several lines still comes out as one line here.
export const truncateWords = (text, maxWords = 8) => {
  const words = String(text ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  if (words.length <= maxWords) return words.join(" ");
  return `${words.slice(0, maxWords).join(" ")}…`;
};
