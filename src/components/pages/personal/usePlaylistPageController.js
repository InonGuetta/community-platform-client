import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { fetchPlaylist } from "../../../store/slicesAndThunks/savesSlice/savesGet";
import { selectUser } from "../../../store/selectors/authSelectors";
import { statuses } from "../../../utilities/constant";

// One saved list: the fetch by the id in the address and the selection, so
// PlaylistPage.jsx is layout only (the useXxxPageController rule).
export const usePlaylistPageController = () => {
  const { playlistId } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { playlist, items, status } = useSelector((state) => state.saves.openList);
  const user = useSelector(selectUser);

  useEffect(() => { dispatch(fetchPlaylist(Number(playlistId))); }, [dispatch, playlistId]);

  const failed = status === statuses.failed;

  return {
    failed,
    items,
    navigate,
    playlist,
    status,
    user,
  };
};
