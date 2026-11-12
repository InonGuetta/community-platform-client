import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { searchTranscripts } from "../../../store/slicesAndThunks/transcriptSlice/transcriptGet";
import { clearSearchResults } from "../../../store/slicesAndThunks/transcriptSlice/transcriptSlice";
import { selectSearchResults } from "../../../store/selectors/transcriptSelectors";

// What the smart search does — one hybrid search per Enter or button press,
// never two at once — so that SmartSearch.jsx is layout only.
export const useSmartSearch = () => {
  const dispatch = useDispatch();
  const results = useSelector(selectSearchResults);
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const runSearch = async () => {
    // Guard against overlapping searches: a search runs an embedding + a GPT-4o
    // rerank (a few seconds). Without this, a second Enter mid-search could let
    // the older (slower) request resolve last and overwrite the newer results.
    if (loading) return;
    const q = value.trim();
    if (!q) {
      dispatch(clearSearchResults());
      setSearched(false);
      return;
    }
    setLoading(true);
    await dispatch(searchTranscripts({ q, mode: "hybrid" }));
    setLoading(false);
    setSearched(true);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") runSearch();
  };

  return { results, value, setValue, loading, searched, runSearch, handleKeyDown };
};
