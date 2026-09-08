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

const ROLE_OPTIONS = Object.values(roles);

const UserFormDialog = ({ open, onClose, onSubmit, initial = {} }) => {
  const [form, setForm] = useState({ email: initial.email || "", password: "", displayName: initial.display_name || "", role: initial.role || "student" });
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle onClose={onClose}>{initial.id ? "עריכת משתמש" : "יצירת משתמש"}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField label="שם תצוגה" value={form.displayName} onChange={set("displayName")} fullWidth />
          <TextField label="אימייל" type="email" value={form.email} onChange={set("email")} fullWidth required />
          {!initial.id && <TextField label="סיסמה" type="password" value={form.password} onChange={set("password")} fullWidth required />}
          <TextField label="תפקיד" value={form.role} onChange={set("role")} select fullWidth>
            {ROLE_OPTIONS.map((r) => <MenuItem key={r} value={r}>{roleLabels[r] || r}</MenuItem>)}
          </TextField>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="outlined">ביטול</Button>
        <Button onClick={() => onSubmit(form)} variant="contained">שמירה</Button>
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
    <Box sx={{ p: 3 }}>
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
