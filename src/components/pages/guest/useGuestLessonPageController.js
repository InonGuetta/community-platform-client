import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { publicApi } from "../../../api/publicApi";
import { selectUser } from "../../../store/selectors/authSelectors";

// A public lesson for a guest (PRD COM-3b, COM-4): fetched from the public API,
// which answers only while the lesson is public and published. Local state —
// nothing else in the app reads a guest's view of a lesson.
export const useGuestLessonPageController = () => {
  const { id } = useParams();
  const user = useSelector(selectUser);
  const [state, setState] = useState({ status: "loading", lesson: null });

  useEffect(() => {
    let current = true;
    setState({ status: "loading", lesson: null });
    publicApi.getLesson(id)
      .then((lesson) => { if (current) setState({ status: "succeeded", lesson }); })
      // A lesson that is not public is a 404 like a missing one; the page says
      // the same thing for both.
      .catch(() => { if (current) setState({ status: "failed", lesson: null }); });
    return () => { current = false; };
  }, [id]);

  return {
    status: state.status,
    lesson: state.lesson,
    streamUrl: publicApi.streamUrl(id),
    // Signed in: the whole lesson page is one click away — notebook, chat and
    // all — provided the lesson is also open to them as a member.
    signedIn: Boolean(user),
    fullLessonPath: `/media/${id}`,
  };
};
