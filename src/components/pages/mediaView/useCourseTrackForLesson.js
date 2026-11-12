import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { coursesApi } from "../../../api/coursesApi";
import { nextAfter, placeInTrack, trackPath } from "../../../utilities/courseTrack";

// A lesson's place in its course (PRD CRS-1, CRS-3): "שיעור 3 מתוך 10", the
// lesson after it, and — when a recording ends — moving on to that one after a
// short countdown the listener can stop.
//
// Asked only for a lesson that belongs to a course. A reader who does not
// follow the course (the server answers 403) simply gets no bar: the lesson is
// open to them for some other reason, and the track is not theirs to walk.

// Long enough to read what is next and press "ביטול"; short enough that a
// phone in a pocket does not sit in silence.
export const ADVANCE_AFTER_SECONDS = 8;

const useCourseTrackForLesson = (media) => {
  const navigate = useNavigate();
  const [track, setTrack] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const timerRef = useRef(null);

  const courseId = media?.course_id ?? null;
  const mediaId = media?.id ?? null;

  useEffect(() => {
    setTrack(null);
    if (!courseId) return undefined;
    let current = true;
    coursesApi.getLessons(courseId)
      .then((data) => { if (current) setTrack(data); })
      .catch(() => { if (current) setTrack(null); });
    return () => { current = false; };
  }, [courseId]);

  const stopCountdown = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = null;
    setCountdown(null);
  }, []);

  // A new lesson starts clean — no countdown carried over from the last one.
  useEffect(() => stopCountdown, [mediaId, stopCountdown]);

  const lessons = track?.lessons ?? [];
  const place = mediaId ? placeInTrack(lessons, mediaId) : null;
  const next = mediaId ? nextAfter(lessons, mediaId) : null;

  const goNext = useCallback(() => {
    stopCountdown();
    if (next) navigate(`/media/${next.id}`);
  }, [next, navigate, stopCountdown]);

  // The player says the recording ended. A book next is offered, not opened:
  // reading is not something to be dropped into by a timer.
  const handleEnded = useCallback(() => {
    if (!next || next.media_type === "text" || timerRef.current) return;
    setCountdown(ADVANCE_AFTER_SECONDS);
    timerRef.current = setInterval(() => {
      setCountdown((left) => (left === null ? null : Math.max(0, left - 1)));
    }, 1000);
  }, [next]);

  // Leaving happens here, not inside the countdown's updater: an updater may be
  // run twice, and must not navigate.
  useEffect(() => {
    if (countdown === 0) goNext();
  }, [countdown, goNext]);

  return {
    inTrack: Boolean(place),
    courseTitle: track?.course?.title ?? media?.course_title ?? "",
    trackHref: courseId ? trackPath(courseId) : null,
    place,
    next,
    countdown,
    goNext,
    stopCountdown,
    handleEnded,
  };
};

export default useCourseTrackForLesson;
