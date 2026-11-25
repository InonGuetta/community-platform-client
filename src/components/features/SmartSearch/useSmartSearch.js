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

  // `override` is a query chosen from the examples; a click event (the button)
  // is not a string, so the box's own text is used then.
  const runSearch = async (override) => {
    // Guard against overlapping searches: a search runs an embedding + a GPT-4o
    // rerank (a few seconds). Without this, a second Enter mid-search could let
    // the older (slower) request resolve last and overwrite the newer results.
    if (loading) return;
    const q = (typeof override === "string" ? override : value).trim();
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

  const searchFor = (q) => {
    setValue(q);
    runSearch(q);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") runSearch();
  };

  return { results, value, setValue, loading, searched, runSearch, searchFor, handleKeyDown };
};
