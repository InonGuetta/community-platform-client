import { useState } from "react";
import Box from "@mui/material/Box";
import Dialog from "@mui/material/Dialog";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import UsersHeader from "./componentsUsers/UsersHeader";
import UsersTable from "./componentsUsers/UsersTable";
import ConfirmingDeletionDialog from "../../features/ConfirmingDeletionDialog/ConfirmingDeletionDialog";
import DialogTitle from "../../features/Dialogs/DialogTitle";
import DialogContent from "../../features/Dialogs/DialogContent";
import DialogActions from "../../features/Dialogs/DialogActions";
import useUsersPageController from "./useUsersPageController";
import { statuses, roles } from "../../../utilities/constant";

const ROLE_OPTIONS = Object.values(roles);

const UserFormDialog = ({ open, onClose, onSubmit, initial = {} }) => {
  const [form, setForm] = useState({ email: initial.email || "", password: "", displayName: initial.display_name || "", role: initial.role || "student" });
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle onClose={onClose}>{initial.id ? "Edit User" : "Create User"}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField label="Display Name" value={form.displayName} onChange={set("displayName")} fullWidth />
          <TextField label="Email" type="email" value={form.email} onChange={set("email")} fullWidth required />
          {!initial.id && <TextField label="Password" type="password" value={form.password} onChange={set("password")} fullWidth required />}
          <TextField label="Role" value={form.role} onChange={set("role")} select fullWidth>
            {ROLE_OPTIONS.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
          </TextField>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="outlined">Cancel</Button>
        <Button onClick={() => onSubmit(form)} variant="contained">Save</Button>
      </DialogActions>
    </Dialog>
  );
};

const UsersPage = () => {
  const {
    filteredUsers, status, setSearch,
    isCreateOpen, setIsCreateOpen,
    editUser, setEditUser,
    isDeleteOpen, itemToDelete,
    handleCreateUser, handleUpdateUser,
    handleDeleteClick, handleDeleteConfirm,
    closeDeleteDialog,
  } = useUsersPageController();

  if (status === statuses.loading && !filteredUsers.length) {
    return <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box>;
  }

  return (
    <Box sx={{ p: 3 }}>
      <UsersHeader onSearch={setSearch} onCreateClick={() => setIsCreateOpen(true)} />
      <UsersTable users={filteredUsers} onEdit={setEditUser} onDelete={handleDeleteClick} />

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
