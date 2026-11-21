import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import StatusBadge from "../../../features/StatusBadge/StatusBadge";
import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ToggleOnIcon from "@mui/icons-material/ToggleOn";
import ToggleOffIcon from "@mui/icons-material/ToggleOff";
import { roleLabels } from "../../../../utilities/constant";
import { useTranslation } from "react-i18next";

const ROLE_TONE = { admin: "error", lecturer: "warning", student: "neutral" };

// Component 15: 36px round icon buttons in mute, a `fill` hover.
const ACTION_SX = { width: 36, height: 36, color: "text.secondary", "&:hover": { bgcolor: "surface.fill" } };

const SKELETON_ROWS = 5;
const SKELETON_COLS = 6;

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
          <StatusBadge tone={user.is_active ? "success" : "neutral"} size="small">{user.is_active ? t("active") : t("inactive")}</StatusBadge>
        </TableCell>
        <TableCell sx={{ whiteSpace: "nowrap" }}>
          {/* Named after the person: a row of bare icons reads "button, button,
              button" to a screen reader (PRD MOB-7 review). */}
          <IconButton size="small" sx={ACTION_SX} onClick={() => onEdit(user)} aria-label={t("edit", { name: user.display_name || user.email })}><EditIcon fontSize="small" /></IconButton>
          {/* Admin-only active toggle. Disabled on your own row so an admin can't
              lock themselves out by deactivating their own account. */}
          {canToggleActive && (
            <Tooltip title={user.id === currentUserId ? t("cannotToggleSelf") : (user.is_active ? t("deactivateHint") : t("activateHint"))}>
              <span>
                <IconButton
                  size="small"
                  sx={{ ...ACTION_SX, ...(user.is_active && { color: "success.main" }) }}
                  disabled={user.id === currentUserId}
                  onClick={() => onToggleActive(user)}
                  aria-label={t(user.is_active ? "deactivate" : "activate", { name: user.display_name || user.email })}
                >
                  {user.is_active ? <ToggleOnIcon fontSize="small" /> : <ToggleOffIcon fontSize="small" />}
                </IconButton>
              </span>
            </Tooltip>
          )}
          <IconButton size="small" sx={{ ...ACTION_SX, "&:hover": { bgcolor: "surface.fill", color: "error.main" } }} onClick={() => onDelete(user)} aria-label={t("delete", { name: user.display_name || user.email })}><DeleteIcon fontSize="small" /></IconButton>
        </TableCell>
      </TableRow>
    )))}
  </TableBody>
  );
};

export default UsersTableContent;
