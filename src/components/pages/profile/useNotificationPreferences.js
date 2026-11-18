import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { notificationsApi } from "../../../api/notificationsApi";
import { notify } from "../../../store/slicesAndThunks/snackbarSlice";
import { selectUser } from "../../../store/selectors/authSelectors";
import i18n from "../../../i18n/i18n";

// The notification switches on the profile page (PRD NOTIF-6, AUTH-13): per
// category, by mail and — where an SMS can carry it — by SMS. The switches are
// local state, because nothing else on any screen reads them; the server
// decides which categories this user can get at all (by role).
//
// Each switch is optimistic: it flips on press and the request follows. On a
// failure it flips back and says so — a switch that silently disagrees with the
// server is the one thing a preference must never do.
//
// Whether SMS can be turned on is the account's verified number, read from the
// auth slice rather than from this card's load: the phone card just above it
// changes that number without this card reloading. A number removed takes
// every SMS choice with it on the server, and here too.
export const ALL = "all";

const useNotificationPreferences = () => {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const phoneVerified = Boolean(user?.phone);
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

  // The number gone: the server has removed every SMS choice with it.
  useEffect(() => {
    if (phoneVerified) return;
    setCategories((prev) =>
      prev.some((c) => c.sms) ? prev.map((c) => (c.sms === null || c.sms === undefined ? c : { ...c, sms: false })) : prev
    );
  }, [phoneVerified]);

  const failed = (rejection) => {
    const code = rejection?.response?.data?.code;
    const message = code === "PHONE_NOT_VERIFIED"
      ? i18n.t("errors:codes.PHONE_NOT_VERIFIED")
      : i18n.t("profile:email.saveFailed");
    dispatch(notify({ message, severity: "error" }));
  };

  const setOne = (key, channel, on) =>
    setCategories((prev) => prev.map((c) => (c.key === key ? { ...c, [channel]: on } : c)));

  const handleToggle = async (key, channel, on) => {
    setOne(key, channel, on);
    try {
      await notificationsApi.setPreference(key, channel, on);
    } catch (err) {
      setOne(key, channel, !on);
      failed(err);
    }
  };

  // Undoing "הסר אותי מכל המיילים" from the unsubscribe page. The categories
  // keep their own switches; this lifts only the blanket one.
  const handleRestoreAll = async () => {
    setAllOff(false);
    try {
      await notificationsApi.setPreference(ALL, "email", true);
    } catch (err) {
      setAllOff(true);
      failed(err);
    }
  };

  // Every SMS off at once — the server clears every SMS choice.
  const anySms = categories.some((c) => c.sms);
  const handleSmsAllOff = async () => {
    const before = categories;
    setCategories((prev) => prev.map((c) => (c.sms ? { ...c, sms: false } : c)));
    try {
      await notificationsApi.setPreference(ALL, "sms", false);
    } catch (err) {
      setCategories(before);
      failed(err);
    }
  };

  const smsOffered = categories.some((c) => c.sms !== null && c.sms !== undefined);

  return { categories, allOff, status, phoneVerified, smsOffered, anySms, handleToggle, handleRestoreAll, handleSmsAllOff };
};

export default useNotificationPreferences;
