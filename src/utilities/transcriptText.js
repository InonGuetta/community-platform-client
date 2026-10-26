// The one definition of "the transcript as plain text". The editor shows it and
// the download menu writes it to a .txt, and those two must never disagree about
// what the user is looking at versus what lands in the file.
//
// edited_text wins when present: a lecturer who corrected the machine output
// expects the corrected version everywhere, not the raw chunks it came from.
//
// A chunk with no `content` contributes nothing: a book's page loads its chunks
// WITHOUT their text, and joining those would hand the download menu a file of
// "undefined" — and a non-empty string, so the fetch of the real text that the
// menu makes when nothing is loaded would never happen.
export const transcriptToText = (transcript) =>
  transcript?.edited_text ||
  (transcript?.chunks || []).filter((c) => typeof c.content === "string").map((c) => c.content).join("\n\n") ||
  "";
