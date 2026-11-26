import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { selectNowPlayingHandover } from "../../../store/selectors/nowPlayingSelectors";
import { clearHandover } from "../../../store/slicesAndThunks/nowPlayingSlice/nowPlayingSlice";

// The lesson page's side of the handover (D-145). When this lesson was playing
// in the bottom player, the bar has stepped aside and left where it was,
// whether it was playing and at what speed; the page takes that once — kept
// here, and cleared from the store, so a later visit resumes from the server's
// saved position instead of a stale one. Null when there is nothing to take.
const useTakeOver = (id) => {
  const dispatch = useDispatch();
  const handover = useSelector(selectNowPlayingHandover);
  const [taken, setTaken] = useState(null);

  // Another lesson: nothing taken over yet.
  useEffect(() => {
    setTaken(null);
  }, [id]);

  useEffect(() => {
    if (!handover || id == null || String(handover.id) !== String(id)) return;
    setTaken(handover);
    dispatch(clearHandover());
  }, [handover, id, dispatch]);

  return taken && String(taken.id) === String(id) ? taken : null;
};

export default useTakeOver;
