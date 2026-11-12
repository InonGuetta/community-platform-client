import { useCallback, useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { fetchNoteBodies } from "../../../store/slicesAndThunks/notesSlice/notesGet";

export const useNoteBodies = () => {
  const dispatch = useDispatch();

  // ── Loading bodies (NOTE-17) ──────────────────────────────────────────────
  //
  // Cards ask for their body as they come near the screen; asks that arrive
  // together are sent as one request. The thunk skips bodies already held, so
  // asking twice costs nothing.
  const bodyQueue = useRef(new Set());
  const bodyTimer = useRef(null);
  // Stable (refs and dispatch only), because each card's observer is keyed on
  // the callback it was given.
  const requestBodies = useCallback((ids) => {
    for (const id of ids) bodyQueue.current.add(id);
    if (bodyTimer.current) return;
    bodyTimer.current = setTimeout(() => {
      const batch = [...bodyQueue.current];
      bodyQueue.current.clear();
      bodyTimer.current = null;
      if (batch.length) dispatch(fetchNoteBodies(batch));
    }, 30);
  }, [dispatch]);
  const onNeedBody = useCallback((id) => requestBodies([id]), [requestBodies]);
  useEffect(() => () => clearTimeout(bodyTimer.current), []);

  return { requestBodies, onNeedBody };
};
