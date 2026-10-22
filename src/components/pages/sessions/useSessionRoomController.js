import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { selectUser } from "../../../store/selectors/authSelectors";
import { joinSession } from "../../../store/slicesAndThunks/sessionsSlice/sessionsPost";
import { hebrewForError } from "../../../utilities/apiError";

// What the session room does — fetch the room token, decide who is host, leave
// — so SessionRoom.jsx is layout only (the useXxxPageController rule: whatever
// dispatches or selects lives here, not in the component).
export const useSessionRoomController = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector(selectUser);

  const [entry, setEntry] = useState({ status: "joining", roomToken: null, session: null, error: null });

  useEffect(() => {
    let cancelled = false;
    setEntry({ status: "joining", roomToken: null, session: null, error: null });

    dispatch(joinSession(id)).then((result) => {
      if (cancelled) return;
      if (result.meta.requestStatus === "fulfilled") {
        setEntry({
          status: "in",
          roomToken: result.payload.roomToken,
          session: result.payload.session,
          error: null,
        });
      } else {
        setEntry({
          status: "refused",
          roomToken: null,
          session: null,
          error: hebrewForError(result.payload, "לא ניתן להצטרף למפגש"),
        });
      }
    });

    return () => { cancelled = true; };
  }, [dispatch, id]);

  // useVideoRoom holds this in a ref so it no longer drives the room's
  // lifecycle, but keeping it stable is correct regardless.
  const handleEnd = useCallback(() => navigate("/sessions"), [navigate]);

  // The host check now comes from the session the join answered with, rather than
  // from a room found in a list that may never have been fetched — which is what
  // made a deep link or a refresh show a host the guest's controls.
  const isHost = Number(entry.session?.host_id) === Number(user?.id);

  // Leaving a refused room goes back to the list.
  const backToSessions = () => navigate("/sessions");

  return {
    entry,
    handleEnd,
    isHost,
    backToSessions,
  };
};
