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

// The notification centre (PRD NOTIF-4): a bell with the unread count, and a
// menu of the latest thirty. Presentation only — the polling, the marking and
// the navigation are in useNotificationBell, which Navbar calls once and passes
// down, because the same hook also feeds the admin's "משתמשים" badge.

// The count as the badge shows it. "99+" past that: a bigger number tells
// nobody anything a badge can, and widens the bar.
const MAX_BADGE = 99;

const NotificationBell = ({ items, unread, anchor, open, onOpen, onClose, onSelect, onMarkAllRead }) => (
  <>
    <Tooltip title="התראות">
      <IconButton
        onClick={onOpen}
        aria-label={unread > 0 ? `התראות, ${unread} שלא נקראו` : "התראות"}
        aria-haspopup="menu"
        aria-expanded={open}
        sx={{ color: "primary.main" }}
      >
        <Badge badgeContent={unread} color="error" max={MAX_BADGE}>
          {unread > 0 ? <NotificationsIcon /> : <NotificationsNoneIcon />}
        </Badge>
      </IconButton>
    </Tooltip>

    <Menu
      anchorEl={anchor}
      open={open}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      transformOrigin={{ vertical: "top", horizontal: "left" }}
      slotProps={{ paper: { sx: { width: 360, maxWidth: "calc(100vw - 24px)", maxHeight: 480 } } }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 2, py: 1 }}>
        <Typography fontWeight={700}>התראות</Typography>
        {unread > 0 && (
          <Button size="small" onClick={onMarkAllRead}>סימון הכל כנקרא</Button>
        )}
      </Box>
      <Divider />

      {items.length === 0 ? (
        // A MenuItem, disabled, rather than loose text: the menu's keyboard
        // handling expects items, and an empty list still has to say so.
        <MenuItem disabled sx={{ whiteSpace: "normal", py: 2 }}>
          <Typography variant="body2" color="text.secondary">
            אין התראות עדיין. כאן תופיע הודעה כשעיבוד של שיעור יסתיים, ועוד.
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

export default NotificationBell;
