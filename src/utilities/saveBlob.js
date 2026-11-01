// Hand a blob to the browser as a download. The anchor has to be IN the document
// for the click to count in Firefox, and the object URL has to outlive the
// download STARTING, not just the click. A 0ms revoke was the next tick, while
// Firefox and Safari can still be reading the blob — a large export then saved
// as a failed or empty file. A few seconds is the usual margin; the URL costs
// nothing in the meantime.
//
// Its own module since a second export (the course roster's CSV) needed it; it
// began inside notesExport.js.
const REVOKE_AFTER_MS = 10_000;

export const saveBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_AFTER_MS);
};
