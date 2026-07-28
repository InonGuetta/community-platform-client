import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { fetchAllMedia } from "../../../store/slicesAndThunks/mediaSlice/mediaGet";
import { deleteMedia } from "../../../store/slicesAndThunks/mediaSlice/mediaDelete";
import { selectAllMedia, selectMediaStatus } from "../../../store/selectors/mediaSelectors";
import { openUpload } from "../../../store/slicesAndThunks/uiSlice";

const useArchivePageController = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const allMedia = useSelector(selectAllMedia);
  const status = useSelector(selectMediaStatus);

  const [typeFilter, setTypeFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  useEffect(() => {
    dispatch(fetchAllMedia());
  }, [dispatch]);

  const handleFilter = (type) => setTypeFilter(type);
  const handleSearch = (query) => setSearchQuery(query);
  const handleOpenMedia = (id) => navigate(`/media/${id}`);
  // Smart-search result → open the media and jump the player to the segment.
  // The ?t= seconds are read by MediaViewPage and seeked once the player is ready.
  const handleOpenResult = (mediaId, startTime) => navigate(`/media/${mediaId}?t=${startTime}`);
  const handleOpenUpload = () => dispatch(openUpload());

  const handleDeleteRequest = (id) => setDeleteTargetId(id);
  const handleDeleteCancel = () => setDeleteTargetId(null);
  const handleDeleteConfirm = async () => {
    await dispatch(deleteMedia(deleteTargetId));
    setDeleteTargetId(null);
  };

  const filteredMedia = allMedia.filter((item) => {
    const matchesType = typeFilter ? item.media_type === typeFilter : true;
    const matchesSearch = searchQuery
      ? item.title.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    return matchesType && matchesSearch;
  });

  // Whether the empty grid is due to an active filter/search (vs a truly empty
  // archive) — lets the empty state choose between "no results" and the upload CTA.
  const hasActiveFilter = Boolean(typeFilter || searchQuery);

  return {
    filteredMedia, status, typeFilter, hasActiveFilter,
    handleFilter, handleSearch, handleOpenMedia, handleOpenUpload, handleOpenResult,
    deleteTargetId, handleDeleteRequest, handleDeleteCancel, handleDeleteConfirm,
  };
};

export default useArchivePageController;
