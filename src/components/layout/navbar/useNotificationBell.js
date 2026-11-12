import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { fetchInbox } from "../../../store/slicesAndThunks/inboxSlice/inboxGet";
import { markNotificationRead, markAllNotificationsRead } from "../../../store/slicesAndThunks/inboxSlice/inboxPost";
import { selectUser } from "../../../store/selectors/authSelectors";
import { describeNotification } from "../../../utilities/notificationText";
import { selectInboxItems, selectInboxUnread, selectPendingRoleRequests } from "../../../store/selectors/inboxSelectors";

// How often the bell asks. A minute: what it reports — a pipeline that took
// twenty minutes, a role request — is not measured in seconds, and this runs on
// every open tab of every signed-in user. The workers are separate processes
// and cannot push over the API server's socket, so it is a poll.
export const INBOX_POLL_MS = 60_000;

// The bell's logic, kept out of the component by the project's rule: it
// dispatches and selects. Also read by Navbar for the admin's "משתמשים" badge.
const useNotificationBell = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector(selectUser);
  const items = useSelector(selectInboxItems);
  const unread = useSelector(selectInboxUnread);
  const pendingRoleRequests = useSelector(selectPendingRoleRequests);
  const [anchor, setAnchor] = useState(null);

  const refresh = useCallback(() => {
    // A hidden tab does not ask: nobody is looking at its bell, and twenty
    // background tabs would otherwise poll twenty times a minute.
    if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
    dispatch(fetchInbox());
  }, [dispatch]);

  // Signed in → ask now, then every minute, and again the moment the tab comes
  // back into view, so returning to the app after an hour shows the hour's news
  // at once rather than up to a minute later.
  const signedIn = Boolean(user?.id);
  useEffect(() => {
    if (!signedIn) return undefined;
    refresh();
    const timer = setInterval(refresh, INBOX_POLL_MS);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [signedIn, refresh]);

  // Opening the menu also asks: the count on the bell may be a minute old, and
  // the list under it should not be.
  const handleOpen = (event) => {
    setAnchor(event.currentTarget);
    refresh();
  };
  const handleClose = () => setAnchor(null);

  // Read on click, then go where it points. Read even when there is nowhere to
  // go, so an unknown type can still be cleared from the count.
  const handleSelect = (notification) => {
    if (!notification.read_at) dispatch(markNotificationRead(notification.id));
    setAnchor(null);
    const { href } = describeNotification(notification);
    if (href) navigate(href);
  };

  const handleMarkAllRead = () => dispatch(markAllNotificationsRead());

  return {
    items, unread, pendingRoleRequests,
    anchor, open: Boolean(anchor),
    handleOpen, handleClose, handleSelect, handleMarkAllRead,
  };
};

export default useNotificationBell;
