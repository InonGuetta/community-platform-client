import { useCallback, useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { mediaApi } from "../../../api/mediaApi";
import { notify } from "../../../store/slicesAndThunks/snackbarSlice";
import { messageForError } from "../../../utilities/apiError";
import { useTranslation } from "react-i18next";

// Tags the LLM proposed for this lesson (PRD ARCH-4), for whoever may tag it:
// what is waiting, asking for proposals now, and accepting or dismissing them.
// Nothing becomes a tag until a person accepts it here.
//
// `onTagged` — the lesson's tags changed, and the page shows them, so the
// lesson is read again.
const useAiTagSuggestions = ({ mediaId, enabled, onTagged }) => {
  const { t } = useTranslation("lesson");
  const dispatch = useDispatch();
  const [suggestions, setSuggestions] = useState([]);
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    if (!enabled || !mediaId) return undefined;
    let current = true;
    setStatus("loading");
    mediaApi.aiTagSuggestions(mediaId)
      .then((rows) => { if (current) { setSuggestions(rows); setStatus("ready"); } })
      // Quiet: an offer that failed to load is not news worth a toast.
      .catch(() => { if (current) { setSuggestions([]); setStatus("ready"); } });
    return () => { current = false; };
  }, [mediaId, enabled]);

  const run = useCallback(async (call, failure, after) => {
    setStatus("working");
    try {
      const rows = await call();
      setSuggestions(rows);
      after?.(rows);
    } catch (err) {
      dispatch(notify({ message: messageForError(err?.response?.data, failure), severity: "error" }));
    } finally {
      setStatus("ready");
    }
  }, [dispatch]);

  return {
    suggestions,
    loading: status === "loading",
    working: status === "working",
    request: () =>
      run(() => mediaApi.requestAiTagSuggestions(mediaId), t("aiTags.requestFailed"), (rows) => {
        if (rows.length === 0) dispatch(notify({ message: t("aiTags.noneFound"), severity: "info" }));
      }),
    approve: (tagIds) =>
      run(() => mediaApi.approveAiTagSuggestions(mediaId, tagIds), t("aiTags.approveFailed"), () => {
        dispatch(notify({ message: t("aiTags.added", { count: tagIds.length }), severity: "success" }));
        onTagged?.();
      }),
    dismiss: (tagIds) => run(() => mediaApi.dismissAiTagSuggestions(mediaId, tagIds), t("aiTags.dismissFailed")),
  };
};

export default useAiTagSuggestions;
