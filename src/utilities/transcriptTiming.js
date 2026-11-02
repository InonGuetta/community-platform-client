import { transcriptToText } from "./transcriptText";

// When each sentence of a recording is said (PRD MOB-5, MOB-6) — for captions
// over the player and for the transcript that scrolls with it.
//
// The server gives a recording's timing as ANCHORS: [wordIndex, seconds] pairs,
// "word N of the transcript starts at second T" (migration 041). Between two
// anchors the time is interpolated by word. A lesson transcribed before that
// migration has no anchors; one is built from its chunks instead — a start and
// an end per ~500 words — which places a sentence to within a few seconds near
// a chunk's edges and less exactly in its middle. `precise` says which it was,
// so the page can say so.
//
// The text shown is whatever the lesson's transcript IS (transcriptToText): the
// lecturer's edited version when there is one. Its words are mapped onto the
// timeline in proportion — word k of a text of N words sits where word
// k × (timed words / N) did. Corrections are local, so that lands close.

// The same rule the server counts words by (services/transcripts/chunks.js).
const wordsOf = (text) => String(text ?? "").trim().split(/\s+/).filter(Boolean);

// Anchors for a lesson with no stored timing: each chunk's first word at its
// start time, and the last word at the last end time.
export const anchorsFromChunks = (chunks = []) => {
  const anchors = [];
  let words = 0;
  let end = null;
  for (const chunk of chunks) {
    const count = wordsOf(chunk.content).length;
    if (count === 0 || !Number.isFinite(chunk.start_time)) continue;
    if (anchors.length === 0 || chunk.start_time >= anchors[anchors.length - 1][1]) {
      anchors.push([words, chunk.start_time]);
    }
    words += count;
    if (Number.isFinite(chunk.end_time)) end = chunk.end_time;
  }
  if (anchors.length > 0 && Number.isFinite(end) && end >= anchors[anchors.length - 1][1]) {
    anchors.push([words, end]);
  }
  return anchors;
};

// The second at which word `w` (fractional allowed) is said.
export const timeAtWord = (anchors, w) => {
  if (!anchors?.length) return 0;
  if (w <= anchors[0][0]) return anchors[0][1];
  const last = anchors[anchors.length - 1];
  if (w >= last[0]) return last[1];
  let lo = 0;
  let hi = anchors.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (anchors[mid][0] <= w) lo = mid;
    else hi = mid;
  }
  const [w0, t0] = anchors[lo];
  const [w1, t1] = anchors[hi];
  return w1 === w0 ? t0 : t0 + ((w - w0) / (w1 - w0)) * (t1 - t0);
};

// A caption is read in the second or two it is on screen: two short lines at
// most. Whisper's Hebrew often has no punctuation at all, so a "sentence" can
// run for a minute — those are cut into even pieces of at most this many words.
export const MAX_CUE_WORDS = 14;

// The text as cues: sentences (and paragraphs), long ones cut evenly. Each
// carries the index of its first word and the index after its last.
export const splitCues = (text, maxWords = MAX_CUE_WORDS) => {
  const cues = [];
  let position = 0;
  const sentences = String(text ?? "")
    .split(/\n+/)
    .flatMap((paragraph) => paragraph.split(/(?<=[.!?…:;])\s+/));
  for (const sentence of sentences) {
    const words = wordsOf(sentence);
    if (words.length === 0) continue;
    const pieces = Math.ceil(words.length / maxWords);
    const size = Math.ceil(words.length / pieces);
    for (let i = 0; i < words.length; i += size) {
      const piece = words.slice(i, i + size);
      cues.push({ text: piece.join(" "), startWord: position, endWord: position + piece.length });
      position += piece.length;
    }
  }
  return cues;
};

// Cues with times: { text, start, end } in seconds, ascending.
export const buildCues = (text, anchors) => {
  if (!anchors || anchors.length < 2) return [];
  const pieces = splitCues(text);
  const total = pieces.length ? pieces[pieces.length - 1].endWord : 0;
  if (total === 0) return [];
  const scale = anchors[anchors.length - 1][0] / total;
  return pieces.map((piece) => {
    const start = timeAtWord(anchors, piece.startWord * scale);
    const end = timeAtWord(anchors, piece.endWord * scale);
    return { text: piece.text, start, end: Math.max(end, start + 0.5) };
  });
};

// Everything the page needs, from the transcript as the store holds it — or
// null when there is nothing to time (a book, a transcript still processing,
// chunks with no times).
export const transcriptCues = (transcript) => {
  if (!transcript) return null;
  const stored = Array.isArray(transcript.timing) && transcript.timing.length >= 2 ? transcript.timing : null;
  const anchors = stored || anchorsFromChunks(transcript.chunks);
  if (anchors.length < 2) return null;
  const cues = buildCues(transcriptToText(transcript), anchors);
  return cues.length ? { cues, precise: Boolean(stored) } : null;
};

// The cue being said at `seconds`: the last one that has started. Null before
// the first.
export const cueIndexAt = (cues, seconds) => {
  if (!cues?.length || !(seconds >= cues[0].start)) return null;
  let lo = 0;
  let hi = cues.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (cues[mid].start <= seconds) lo = mid;
    else hi = mid - 1;
  }
  return lo;
};

// The caption to show at `seconds`: the current cue while it lasts, and nothing
// in a long pause after it — a caption left over silence reads as stuck.
export const captionAt = (cues, seconds) => {
  const index = cueIndexAt(cues, seconds);
  if (index === null) return null;
  const cue = cues[index];
  return seconds <= cue.end + 1.5 ? cue.text : null;
};

const vttTime = (seconds) => {
  const ms = Math.max(0, Math.round(seconds * 1000));
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const pad = (n, w = 2) => String(n).padStart(w, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}.${pad(ms % 1000, 3)}`;
};

// A WebVTT file — what players, editors and YouTube read as captions. Each cue
// ends where the next begins at the latest, since a player shows overlapping
// cues one above the other. A note at the top says when the times are
// estimated.
export const toVtt = (cues, { precise = true } = {}) => {
  const header = precise
    ? "WEBVTT\n\n"
    : "WEBVTT\n\nNOTE\nהזמנים משוערים: השיעור תומלל לפני שנשמר תזמון מדויק לכל משפט.\n\n";
  const body = cues
    .map((cue, i) => {
      const next = cues[i + 1];
      const end = next ? Math.min(cue.end, next.start) : cue.end;
      return `${i + 1}\n${vttTime(cue.start)} --> ${vttTime(Math.max(end, cue.start + 0.1))}\n${cue.text}\n`;
    })
    .join("\n");
  return header + body;
};
