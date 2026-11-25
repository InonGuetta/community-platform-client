import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import StatusBadge from "../../../features/StatusBadge/StatusBadge";
import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Switch from "@mui/material/Switch";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { useState } from "react";
import { useDirection, menuOrigins } from "../../../../i18n/useDirection";
import { roleLabels } from "../../../../utilities/constant";
import { useTranslation } from "react-i18next";

const ROLE_TONE = { admin: "indigo", lecturer: "warning", student: "neutral" };

// Component 15: 36px round icon buttons in mute, a `fill` hover.
const ACTION_SX = { width: 36, height: 36, color: "text.secondary", "&:hover": { bgcolor: "surface.fill" } };

const SKELETON_ROWS = 5;
const SKELETON_COLS = 6;

// Delete is not a neighbour of edit: it lives behind ⋮, and the existing
// confirmation dialog still stands between the click and the deletion
// (UI_UX_FIXES 3.13).
const RowMenu = ({ user, onDelete }) => {
  const { t } = useTranslation("users");
  const { end } = useDirection();
  const [anchor, setAnchor] = useState(null);
  const name = user.display_name || user.email;
  return (
    <>
      <IconButton size="small" sx={ACTION_SX} onClick={(e) => setAnchor(e.currentTarget)} aria-label={t("more", { name })} aria-haspopup="menu" aria-expanded={Boolean(anchor)}>
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)} {...menuOrigins(end)}>
        <MenuItem
          onClick={() => {
            setAnchor(null);
            onDelete(user);
          }}
          sx={{ color: "surface.danger" }}
        >
          <ListItemIcon sx={{ color: "inherit", minWidth: 32 }}><DeleteIcon fontSize="small" /></ListItemIcon>
          {t("delete", { name })}
        </MenuItem>
      </Menu>
    </>
  );
};

const UsersTableContent = ({ users, onEdit, onDelete, onToggleActive, canToggleActive = false, currentUserId, loading = false }) => {
  const { t } = useTranslation("users");
  return (
  <TableBody>
    {loading && users.length === 0 ? (
      Array.from({ length: SKELETON_ROWS }).map((_, r) => (
        <TableRow key={`skeleton-${r}`}>
          {Array.from({ length: SKELETON_COLS }).map((__, c) => (
            <TableCell key={c}><Skeleton /></TableCell>
          ))}
        </TableRow>
      ))
    ) : (
    users.map((user) => (
      <TableRow key={user.id} sx={{ opacity: user.is_active ? 1 : 0.5 }}>
        <TableCell>{user.id}</TableCell>
        <TableCell sx={{ fontWeight: 600 }}>{user.display_name || "—"}</TableCell>
        <TableCell>
          <Box component="span" dir="ltr" sx={{ display: "block", fontSize: 14, color: "surface.ink2", unicodeBidi: "isolate", textAlign: "start" }}>{user.email}</Box>
          {/* A verified number, masked by the server (AUTH-13): whether the
              member has one, never the number itself. */}
          {user.phone_masked && (
            <Box component="span" dir="ltr" sx={{ display: "block", color: "text.secondary", fontSize: 12 }} aria-label={t("phoneMasked", { phone: user.phone_masked })}>
              {user.phone_masked}
            </Box>
          )}
        </TableCell>
        <TableCell>
          <StatusBadge tone={ROLE_TONE[user.role] ?? "neutral"} size="small">{roleLabels[user.role] || user.role}</StatusBadge>
        </TableCell>
        <TableCell>
          {/* One place for the status: the switch, for whoever may flip it
              (UI_UX_FIXES 3.13); a badge for the rest. Disabled on your own row
              so an admin can't lock themselves out. */}
          {canToggleActive ? (
            <Tooltip title={user.id === currentUserId ? t("cannotToggleSelf") : (user.is_active ? t("deactivateHint") : t("activateHint"))}>
              <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
                <Switch
                  size="small"
                  checked={Boolean(user.is_active)}
                  disabled={user.id === currentUserId}
                  onChange={() => onToggleActive(user)}
                  inputProps={{ role: "switch", "aria-label": t(user.is_active ? "deactivate" : "activate", { name: user.display_name || user.email }) }}
                />
                <Box component="span" sx={{ fontSize: 13, color: user.is_active ? "success.main" : "text.secondary" }}>
                  {user.is_active ? t("active") : t("inactive")}
                </Box>
              </Box>
            </Tooltip>
          ) : (
            <StatusBadge tone={user.is_active ? "success" : "neutral"} size="small">{user.is_active ? t("active") : t("inactive")}</StatusBadge>
          )}
        </TableCell>
        <TableCell sx={{ whiteSpace: "nowrap", paddingBlock: "10px" }}>
          {/* Named after the person: a row of bare icons reads "button, button,
              button" to a screen reader (PRD MOB-7 review). */}
          <IconButton size="small" sx={ACTION_SX} onClick={() => onEdit(user)} aria-label={t("edit", { name: user.display_name || user.email })}><EditIcon fontSize="small" /></IconButton>
          <RowMenu user={user} onDelete={onDelete} />
        </TableCell>
      </TableRow>
    )))}
  </TableBody>
  );
};

export default UsersTableContent;
