import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { selectAuthUnreachable, selectUser } from "../../../store/selectors/authSelectors";
import { selectOfflineItems, selectOfflineLoaded, selectOfflineProgress } from "../../../store/selectors/offlineSelectors";
import { loadOfflineLessons, cancelOfflineSave } from "../../../store/slicesAndThunks/offlineSlice/offlineGet";
import { clearOfflineLessons, removeOfflineLesson } from "../../../store/slicesAndThunks/offlineSlice/offlineDelete";
import { offlineSupported, storageEstimate } from "../../../utilities/offlineStore";

// The downloads page (PRD MOB-2). Everything it shows comes from the device —
// it is the one page that must work with no server — so nothing here asks the
// API for anything.

const useOnline = () => {
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine !== false));
  useEffect(() => {
    const update = () => setOnline(navigator.onLine !== false);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online;
};

export const useDownloadsPageController = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const items = useSelector(selectOfflineItems);
  const loaded = useSelector(selectOfflineLoaded);
  const progress = useSelector(selectOfflineProgress);
  const user = useSelector(selectUser);
  const unreachable = useSelector(selectAuthUnreachable);
  const online = useOnline();

  const [playingId, setPlayingId] = useState(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [estimate, setEstimate] = useState(null);

  useEffect(() => {
    dispatch(loadOfflineLessons());
  }, [dispatch]);

  // Measured again whenever the list changes: the space a download took, or one
  // that a deletion gave back, is the number the reader is looking at.
  useEffect(() => {
    let current = true;
    storageEstimate().then((value) => { if (current) setEstimate(value); });
    return () => { current = false; };
  }, [items]);

  const downloading = useMemo(
    () => Object.entries(progress).map(([id, entry]) => ({ id: Number(id), ...entry })),
    [progress]
  );
  const totalSize = useMemo(() => items.reduce((sum, item) => sum + (item.size || 0), 0), [items]);
  const playing = items.find((item) => item.id === playingId) ?? null;

  const remove = useCallback((id) => {
    setPlayingId((current) => (current === id ? null : current));
    dispatch(removeOfflineLesson(id));
  }, [dispatch]);

  const clearAll = useCallback(() => {
    setConfirmClear(false);
    setPlayingId(null);
    dispatch(clearOfflineLessons());
  }, [dispatch]);

  return {
    items,
    loaded,
    downloading,
    totalSize,
    estimate,
    playing,
    play: setPlayingId,
    closePlayer: () => setPlayingId(null),
    remove,
    cancel: cancelOfflineSave,
    confirmClear,
    askClear: () => setConfirmClear(true),
    cancelClear: () => setConfirmClear(false),
    clearAll,
    supported: offlineSupported(),
    // No network on the device, or no server answering: either way the lessons
    // below are all there is, and a link to a lesson's page would lead nowhere.
    offline: !online || (unreachable && !user),
    openLesson: (id) => navigate(`/media/${id}`),
    goToArchive: () => navigate("/archive"),
    retry: () => window.location.reload(),
  };
};
