import { useCallback, useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { coursesApi } from "../../../api/coursesApi";
import { notify } from "../../../store/slicesAndThunks/snackbarSlice";

// One course as a track (PRD CRS-1, CRS-2): its lessons in order with the
// reader's progress, the lesson to carry on from, and — for its lecturer —
// arranging the order by dragging.
//
// Local state rather than the store: nothing else on screen reads a track, and
// it is read fresh each time the page opens, since progress moves whenever a
// lesson is listened to anywhere.
export const useCourseTrackPageController = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [state, setState] = useState({ status: "loading", data: null, forbidden: false });

  useEffect(() => {
    let current = true;
    setState({ status: "loading", data: null, forbidden: false });
    coursesApi
      .getLessons(id)
      .then((data) => { if (current) setState({ status: "succeeded", data, forbidden: false }); })
      .catch((err) => {
        if (current) setState({ status: "failed", data: null, forbidden: err?.response?.status === 403 });
      });
    return () => { current = false; };
  }, [id]);

  // Optimistic: the rows move as they are dropped, and move back if the server
  // refuses — a list that snaps back without a word reads as a drop that missed.
  const reorder = useCallback(async (orderedIds) => {
    const previous = state.data;
    if (!previous) return;
    const byId = new Map(previous.lessons.map((l) => [l.id, l]));
    setState((s) => ({ ...s, data: { ...s.data, lessons: orderedIds.map((lessonId) => byId.get(lessonId)) } }));
    try {
      await coursesApi.reorderLessons(previous.course.id, orderedIds);
    } catch {
      setState((s) => ({ ...s, data: previous }));
      dispatch(notify({ message: "שמירת סדר השיעורים נכשלה. הסדר הקודם הוחזר.", severity: "error" }));
    }
  }, [state.data, dispatch]);

  const data = state.data;
  const next = data?.summary?.nextId ? data.lessons.find((l) => l.id === data.summary.nextId) : null;

  return {
    status: state.status,
    forbidden: state.forbidden,
    course: data?.course ?? null,
    lessons: data?.lessons ?? [],
    summary: data?.summary ?? { total: 0, completed: 0, nextId: null },
    canArrange: Boolean(data?.canArrange),
    next,
    reorder,
    openLesson: (lessonId) => navigate(`/media/${lessonId}`),
    goToMyCourses: () => navigate("/my-courses"),
  };
};
