import { useState } from "react";
import Box from "@mui/material/Box";
import Dialog from "@mui/material/Dialog";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import UsersHeader from "./componentsUsers/UsersHeader";
import UsersTable from "./componentsUsers/UsersTable";
import PendingApprovals from "./componentsUsers/PendingApprovals";
import ConfirmingDeletionDialog from "../../features/ConfirmingDeletionDialog/ConfirmingDeletionDialog";
import DialogTitle from "../../features/Dialogs/DialogTitle";
import DialogContent from "../../features/Dialogs/DialogContent";
import DialogActions from "../../features/Dialogs/DialogActions";
import useUsersPageController from "./useUsersPageController";
import { statuses, roles, roleLabels } from "../../../utilities/constant";
import { useTranslation } from "react-i18next";

const ROLE_OPTIONS = Object.values(roles);

const UserFormDialog = ({ open, onClose, onSubmit, initial = {} }) => {
  "use no memo"; // reads i18next outside useTranslation's t while rendering: compiled, it would keep the old language
  const { t } = useTranslation(["users", "common"]);
  const [form, setForm] = useState({ email: initial.email || "", password: "", displayName: initial.display_name || "", role: initial.role || "student" });
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle onClose={onClose}>{initial.id ? t("form.editTitle") : t("form.createTitle")}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField label={t("form.displayName")} value={form.displayName} onChange={set("displayName")} fullWidth />
          <TextField label={t("form.email")} type="email" value={form.email} onChange={set("email")} fullWidth required />
          {!initial.id && <TextField label={t("form.password")} type="password" value={form.password} onChange={set("password")} fullWidth required />}
          <TextField label={t("form.role")} value={form.role} onChange={set("role")} select fullWidth>
            {ROLE_OPTIONS.map((r) => <MenuItem key={r} value={r}>{roleLabels[r] || r}</MenuItem>)}
          </TextField>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="outlined">{t("common:actions.cancel")}</Button>
        <Button onClick={() => onSubmit(form)} variant="contained">{t("form.save")}</Button>
      </DialogActions>
    </Dialog>
  );
};

const UsersPage = () => {
  const {
    filteredUsers, status, setSearch,
    isAdmin, currentUserId,
    isCreateOpen, setIsCreateOpen,
    editUser, setEditUser,
    isDeleteOpen, itemToDelete,
    handleCreateUser, handleUpdateUser, handleToggleActive,
    handleDeleteClick, handleDeleteConfirm,
    closeDeleteDialog,
    pendingApprovals, handleApprove, handleReject,
  } = useUsersPageController();

  return (
    <Box>
      <UsersHeader onSearch={setSearch} onCreateClick={() => setIsCreateOpen(true)} />
      {/* Above the table, and absent entirely when the queue is empty — a
          request is a task, and a task rendered as one more chip in a long
          table is a task nobody performs. */}
      <PendingApprovals
        pending={pendingApprovals}
        currentUserId={currentUserId}
        onApprove={handleApprove}
        onReject={handleReject}
      />
      <UsersTable
        users={filteredUsers}
        onEdit={setEditUser}
        onDelete={handleDeleteClick}
        onToggleActive={handleToggleActive}
        canToggleActive={isAdmin}
        currentUserId={currentUserId}
        loading={status === statuses.loading}
      />

      <UserFormDialog open={isCreateOpen} onClose={() => setIsCreateOpen(false)} onSubmit={handleCreateUser} />
      {editUser && (
        <UserFormDialog open={!!editUser} onClose={() => setEditUser(null)} onSubmit={handleUpdateUser} initial={editUser} />
      )}

      <ConfirmingDeletionDialog
        open={isDeleteOpen}
        onClose={closeDeleteDialog}
        onConfirm={handleDeleteConfirm}
        itemName={itemToDelete?.email}
        type="user"
      />
    </Box>
  );
};

export default UsersPage;
