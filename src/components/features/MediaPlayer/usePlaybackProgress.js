import { useCallback, useEffect, useRef, useState } from "react";
import { mediaApi } from "../../../api/mediaApi";

// Where a reader is in a lesson, kept on the server (`/media/:id/progress`) —
// Resume Playback, and what the "המשך צפייה" shelf and the archive's hero are
// built from. Taken out of the lesson page's controller so the bottom player
// (D-145) saves and resumes through the same code, at the same pace.

// How often a playing position is persisted. The player reports progress every
// ~1s; writing that straight through would be a request per second per viewer,
// for a value nobody reads until the next visit.
export const SAVE_PROGRESS_EVERY_MS = 10000;

/**
 * @param {number|string|null} id  the lesson; null when nothing is loaded
 * @returns {{
 *   resumePosition: number,        seconds to start from (0 = the beginning)
 *   resumeSettled: boolean,        the saved position has been asked for and answered
 *   reportProgress: (seconds: number) => void,   every tick; saves at most every ten seconds
 *   saveNow: (seconds: number) => Promise<void>, a save at once (the end, a handover)
 * }}
 */
const usePlaybackProgress = (id) => {
  // Kept with the id it belongs to, so a new lesson never starts from the last
  // one's position while its own is still on the way.
  const [resume, setResume] = useState({ id: null, position: 0 });

  // Failures (no progress yet, network) are silent — we just start from the
  // beginning.
  useEffect(() => {
    if (id == null) return undefined;
    let cancelled = false;
    (async () => {
      let position = 0;
      try {
        const data = await mediaApi.getProgress(id);
        if (data?.last_position_seconds > 0) position = data.last_position_seconds;
      } catch { /* start from the beginning */ }
      if (!cancelled) setResume({ id, position });
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const resumeSettled = id != null && String(resume.id) === String(id);

  // Failures are silent — losing a position is not worth a toast.
  const lastSavedAtRef = useRef(0);
  const reportProgress = useCallback((seconds) => {
    const now = Date.now();
    if (now - lastSavedAtRef.current < SAVE_PROGRESS_EVERY_MS) return;
    lastSavedAtRef.current = now;
    mediaApi.saveProgress(id, seconds).catch(() => {});
  }, [id]);

  const saveNow = useCallback(async (seconds) => {
    if (id == null || !(seconds > 0)) return;
    lastSavedAtRef.current = Date.now();
    try {
      await mediaApi.saveProgress(id, Math.round(seconds));
    } catch { /* silent, as above */ }
  }, [id]);

  return { resumePosition: resumeSettled ? resume.position : 0, resumeSettled, reportProgress, saveNow };
};

export default usePlaybackProgress;
