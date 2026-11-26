import { useCallback, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { fetchConversation } from "../../../store/slicesAndThunks/discussionSlice/discussionGet";
import { startConversation, askQuestion } from "../../../store/slicesAndThunks/discussionSlice/discussionPost";
import { clearAskError } from "../../../store/slicesAndThunks/discussionSlice/discussionSlice";
import { notify } from "../../../store/slicesAndThunks/snackbarSlice";
import { selectDiscussionByMediaId, selectDiscussionQuota } from "../../../store/selectors/discussionSelectors";
import { ARCHIVE_DISCUSSION } from "../../../api/discussionApi";
import { statuses } from "../../../utilities/constant";
import { placeHref } from "../../../utilities/discussionPlace";
import { conversationText } from "../../../utilities/discussionNote";
import i18n from "../../../i18n/i18n";
import { useBottomChrome } from "../../layout/useBottomChrome";

// "שאל את הארכיון" (PRD ASK-2): the lesson chat's slice, thunks and pane,
// keyed by ARCHIVE_DISCUSSION instead of a lesson id — the server answers the
// archive at the same paths. What differs is here: there is no lesson to wait
// for, and a citation opens the lesson it is from rather than seeking a player.

const ARCHIVE = ARCHIVE_DISCUSSION;

// Offered on an empty conversation. Questions that are worth asking of many
// lessons at once — the reason to ask the archive rather than one lesson.
// Each names a subject: the search needs one. "במה המרצים חלוקים?" was tried
// in the browser and, half the time, the reranker judged every passage
// irrelevant to it and the archive answered that it found nothing.
export const archiveSuggestions = () => i18n.t("chat:archiveSuggestions", { returnObjects: true });

const useAskArchivePageController = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const selectArchive = useMemo(() => selectDiscussionByMediaId(ARCHIVE), []);
  const archive = useSelector(selectArchive);
  const quota = useSelector(selectDiscussionQuota);

  useEffect(() => {
    if (archive.loadStatus === statuses.idle) dispatch(fetchConversation(ARCHIVE));
  }, [dispatch, archive.loadStatus]);

  const ask = useCallback(async (text) => {
    const question = String(text ?? "").trim();
    if (!question || archive.asking) return false;
    const action = await dispatch(askQuestion({ mediaId: ARCHIVE, question }));
    return askQuestion.fulfilled.match(action);
  }, [dispatch, archive.asking]);

  const copy = useCallback(async (messages) => {
    try {
      await navigator.clipboard.writeText(conversationText(messages, { mediaTitle: i18n.t("chat:archiveName") }));
      dispatch(notify({ message: i18n.t("chat:copied"), severity: "success" }));
      return true;
    } catch {
      dispatch(notify({ message: i18n.t("chat:copyFailed"), severity: "warning" }));
      return false;
    }
  }, [dispatch]);

  // A citation opens its own lesson, at the moment or page it cites.
  const opener = useMemo(() => ({
    can: (place) => place.mediaId != null,
    go: (place) => navigate(placeHref(place)),
  }), [navigate]);

  // The question box floats above the dock — higher while the bottom player
  // holds the foot of the screen (D-145).
  const { dockOffset } = useBottomChrome();

  return {
    opener,
    dockOffset,
    chat: {
      conversation: archive.conversation,
      messages: archive.messages,
      loadStatus: archive.loadStatus,
      loadError: archive.loadError,
      asking: archive.asking,
      askStage: archive.askStage,
      askError: archive.askError,
      quota,
      copy,
      ask,
      startNew: () => dispatch(startConversation(ARCHIVE)),
      dismissAskError: () => dispatch(clearAskError(ARCHIVE)),
      retryLoad: () => dispatch(fetchConversation(ARCHIVE)),
    },
  };
};

export default useAskArchivePageController;
