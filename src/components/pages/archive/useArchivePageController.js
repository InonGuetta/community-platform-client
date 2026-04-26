import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { fetchAllMedia } from "../../../store/slicesAndThunks/mediaSlice/mediaGet";
import { selectAllMedia, selectMediaStatus } from "../../../store/selectors/mediaSelectors";
import { openUpload } from "../../../store/slicesAndThunks/uiSlice";

const useArchivePageController = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const allMedia = useSelector(selectAllMedia);
  const status = useSelector(selectMediaStatus);

  const [typeFilter, setTypeFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    dispatch(fetchAllMedia());
  }, [dispatch]);

  const handleFilter = (type) => setTypeFilter(type);

  const handleSearch = (query) => setSearchQuery(query);

  const handleOpenMedia = (id) => navigate(`/media/${id}`);

  const handleOpenUpload = () => dispatch(openUpload());

  const filteredMedia = allMedia.filter((item) => {
    const matchesType = typeFilter ? item.media_type === typeFilter : true;
    const matchesSearch = searchQuery
      ? item.title.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    return matchesType && matchesSearch;
  });

  return { filteredMedia, status, typeFilter, handleFilter, handleSearch, handleOpenMedia, handleOpenUpload };
};

export default useArchivePageController;
