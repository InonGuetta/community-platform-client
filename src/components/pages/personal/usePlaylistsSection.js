import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchPlaylists } from "../../../store/slicesAndThunks/savesSlice/savesGet";
import { selectUser } from "../../../store/selectors/authSelectors";
import { selectPlaylists, selectPlaylistsStatus } from "../../../store/selectors/savesSelectors";
import { statuses } from "../../../utilities/constant";

// What the saved-lists section loads, so that PlaylistsSection.jsx is layout
// only: the user's lists with what is inside each, and who is looking (each
// card's menu needs it).
export const usePlaylistsSection = () => {
  const dispatch = useDispatch();
  const playlists = useSelector(selectPlaylists);
  const status = useSelector(selectPlaylistsStatus);
  const user = useSelector(selectUser);

  // withItems, because this page draws what is INSIDE each list. The save menu
  // calls the same thunk without it — see savesApi.listPlaylists.
  useEffect(() => { dispatch(fetchPlaylists({ withItems: true })); }, [dispatch]);

  const loading = status === statuses.loading && playlists.length === 0;

  return { playlists, status, user, loading };
};
