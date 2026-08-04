// The one definition of "the transcript as plain text". The editor shows it and
// the download menu writes it to a .txt, and those two must never disagree about
// what the user is looking at versus what lands in the file.
//
// edited_text wins when present: a lecturer who corrected the machine output
// expects the corrected version everywhere, not the raw chunks it came from.
export const transcriptToText = (transcript) =>
  transcript?.edited_text || (transcript?.chunks || []).map((c) => c.content).join("\n\n") || "";
