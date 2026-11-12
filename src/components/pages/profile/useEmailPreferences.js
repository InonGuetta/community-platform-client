import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { notificationsApi } from "../../../api/notificationsApi";
import { notify } from "../../../store/slicesAndThunks/snackbarSlice";

// The mail switches on the profile page (PRD NOTIF-6) — local state, because
// nothing else on any screen reads them. The server decides which categories
// this user can get at all (by role), so the card renders exactly that list.
//
// Each switch is optimistic: it flips on press and the request follows. On a
// failure it flips back and says so — a switch that silently disagrees with the
// server is the one thing a preference must never do.
export const ALL = "all";

const useEmailPreferences = () => {
  const dispatch = useDispatch();
  const [categories, setCategories] = useState([]);
  const [allOff, setAllOff] = useState(false);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let live = true;
    notificationsApi
      .preferences()
      .then((data) => {
        if (!live) return;
        setCategories(data.categories ?? []);
        setAllOff(Boolean(data.allOff));
        setStatus("ready");
      })
      .catch(() => { if (live) setStatus("failed"); });
    return () => { live = false; };
  }, []);

  const failed = () => dispatch(notify({ message: "שמירת ההעדפה נכשלה", severity: "error" }));

  const handleToggle = async (key, email) => {
    setCategories((prev) => prev.map((c) => (c.key === key ? { ...c, email } : c)));
    try {
      await notificationsApi.setPreference(key, email);
    } catch {
      setCategories((prev) => prev.map((c) => (c.key === key ? { ...c, email: !email } : c)));
      failed();
    }
  };

  // Undoing "הסר אותי מכל המיילים" from the unsubscribe page. The categories
  // keep their own switches; this lifts only the blanket one.
  const handleRestoreAll = async () => {
    setAllOff(false);
    try {
      await notificationsApi.setPreference(ALL, true);
    } catch {
      setAllOff(true);
      failed();
    }
  };

  return { categories, allOff, status, handleToggle, handleRestoreAll };
};

export default useEmailPreferences;
