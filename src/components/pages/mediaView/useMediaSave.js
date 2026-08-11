import { useCallback, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchSavedIds } from "../../../store/slicesAndThunks/savesSlice/savesGet";
import { saveMedia } from "../../../store/slicesAndThunks/savesSlice/savesPost";
import { unsaveMedia } from "../../../store/slicesAndThunks/savesSlice/savesDelete";

// Whether this viewer has saved a given lecture, and the toggle for it — the
// same shape as useMediaLike, and shared by the same two screens.
//
// Saving is not liking: a like is an opinion about a lecture, a save is a
// decision to come back to it. They are separate tables on the server for that
// reason, and separate hooks here so neither screen has to know it.
const useMediaSave = (mediaId) => {
  const dispatch = useDispatch();

  const savedIds = useSelector((state) => state.saves.ids);

  // Fetched once per mount, as the liked ids are. Both are small id sets that
  // several screens read, which is why they live in the store rather than being
  // asked for per lecture.
  useEffect(() => { dispatch(fetchSavedIds()); }, [dispatch]);

  const id = Number(mediaId) || null;
  const isSaved = id ? savedIds.includes(id) : false;

  const toggleSave = useCallback(() => {
    if (!id) return;
    dispatch(isSaved ? unsaveMedia(id) : saveMedia(id));
  }, [dispatch, isSaved, id]);

  return { isSaved, toggleSave };
};

export default useMediaSave;
