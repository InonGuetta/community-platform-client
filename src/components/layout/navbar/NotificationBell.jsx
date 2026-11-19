import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import NotificationsIcon from "@mui/icons-material/Notifications";
import { describeNotification, notificationAge } from "../../../utilities/notificationText";
import { useDirection, menuOrigins } from "../../../i18n/useDirection";
import { useTranslation } from "react-i18next";

// The notification centre (PRD NOTIF-4): a bell with the unread count, and a
// menu of the latest thirty. Presentation only — the polling, the marking and
// the navigation are in useNotificationBell, which useAppShell calls once and
// AppHeader passes down, because the same hook also feeds the admin's
// "משתמשים" pill.

const NotificationBell = ({ items, unread, anchor, open, onOpen, onClose, onSelect, onMarkAllRead }) => {
  // The panel hangs from the bell toward the end of the line — into the page,
  // not off its edge.
  const { end } = useDirection();
  const { t } = useTranslation("nav");
  return (
  <>
    <Tooltip title={t("bell.title")}>
      <IconButton
        onClick={onOpen}
        aria-label={unread > 0 ? t("bell.unread", { count: unread }) : t("bell.title")}
        aria-haspopup="menu"
        aria-expanded={open}
        sx={{ color: "surface.ink2", p: 0.75 }}
      >
        {/* A red dot when anything is unread (component 1); how many is in
            the button's name. */}
        <Badge
          variant="dot"
          invisible={unread === 0}
          sx={{ "& .MuiBadge-dot": { bgcolor: "surface.danger", width: 8, height: 8, borderRadius: "50%", border: "2px solid", borderColor: "background.default", boxSizing: "content-box" } }}
        >
          {unread > 0 ? <NotificationsIcon sx={{ fontSize: 20 }} /> : <NotificationsNoneIcon sx={{ fontSize: 20 }} />}
        </Badge>
      </IconButton>
    </Tooltip>

    <Menu
      anchorEl={anchor}
      open={open}
      onClose={onClose}
      {...menuOrigins(end)}
      slotProps={{ paper: { sx: { width: 360, maxWidth: "calc(100vw - 24px)", maxHeight: 480 } } }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 2, py: 1 }}>
        <Typography fontWeight={700}>{t("bell.title")}</Typography>
        {unread > 0 && (
          <Button size="small" onClick={onMarkAllRead}>{t("bell.markAllRead")}</Button>
        )}
      </Box>
      <Divider />

      {items.length === 0 ? (
        // A MenuItem, disabled, rather than loose text: the menu's keyboard
        // handling expects items, and an empty list still has to say so.
        <MenuItem disabled sx={{ whiteSpace: "normal", py: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {t("bell.empty")}
          </Typography>
        </MenuItem>
      ) : (
        items.map((notification) => {
          const { title, body } = describeNotification(notification);
          const unreadItem = !notification.read_at;
          return (
            <MenuItem
              key={notification.id}
              onClick={() => onSelect(notification)}
              sx={{
                alignItems: "flex-start", gap: 1.5, py: 1.25, whiteSpace: "normal",
                bgcolor: unreadItem ? "action.hover" : "transparent",
              }}
            >
              {/* The unread dot. Colour is not the only signal — the title is
                  bold too — so it reads the same without colour vision. */}
              <Box
                aria-hidden
                sx={{
                  width: 8, height: 8, mt: 0.9, borderRadius: "50%", flexShrink: 0,
                  bgcolor: unreadItem ? "primary.main" : "transparent",
                }}
              />
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" fontWeight={unreadItem ? 700 : 500}>{title}</Typography>
                {body && (
                  <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
                    {body}
                  </Typography>
                )}
                <Typography variant="caption" color="text.secondary">
                  {notificationAge(notification.created_at)}
                </Typography>
              </Box>
            </MenuItem>
          );
        })
      )}
    </Menu>
  </>
  );
};

export default NotificationBell;
