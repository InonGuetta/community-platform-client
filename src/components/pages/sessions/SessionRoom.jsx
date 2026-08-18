import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import VideoRoom from "../../features/VideoRoom/VideoRoom";
import { selectUser } from "../../../store/selectors/authSelectors";
import { joinSession } from "../../../store/slicesAndThunks/sessionsSlice/sessionsPost";
import { hebrewForError } from "../../../utilities/apiError";

// The room, reached by session ID rather than by room token.
//
// The token used to be the URL. It travelled on every row of the public sessions
// list, which meant the string ARCHITECTURE.md calls "the capability" was handed
// to everyone who could see the list — and stayed in their history afterwards.
// Now the page asks the server to let it in, and the server answers with a token
// only if it agrees. The rule has not changed (any signed-in user may enter a
// live session); what changed is that a rule now decides it.
//
// The token lives in component state and nowhere else. Not in Redux: it is a
// credential with the lifetime of one room, and the store is inspectable,
// serialised into devtools and kept for the life of the tab. Leaving this page
// drops it.
const SessionRoom = () => {
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

  if (entry.status === "joining") {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (entry.status === "refused") {
    return (
      <Box sx={{ p: 3, maxWidth: 520, mx: "auto" }}>
        <Alert
          severity="info"
          action={<Button color="inherit" size="small" onClick={() => navigate("/sessions")}>למפגשים</Button>}
        >
          {entry.error}
        </Alert>
      </Box>
    );
  }

  // The host check now comes from the session the join answered with, rather than
  // from a room found in a list that may never have been fetched — which is what
  // made a deep link or a refresh show a host the guest's controls.
  const isHost = Number(entry.session?.host_id) === Number(user?.id);

  return (
    <Box sx={{ height: "calc(100vh - 64px)", display: "flex", flexDirection: "column" }}>
      {/* userId is not passed: the server takes the identity from the signed
          token rather than from anything the client claims. */}
      <VideoRoom
        roomToken={entry.roomToken}
        isHost={isHost}
        onEnd={handleEnd}
      />
    </Box>
  );
};

export default SessionRoom;
