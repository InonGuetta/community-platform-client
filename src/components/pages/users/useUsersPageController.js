import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchAllUsers } from "../../../store/slicesAndThunks/usersSlice/usersSliceGet";
import { createUser } from "../../../store/slicesAndThunks/usersSlice/usersSlicePost";
import { updateUser } from "../../../store/slicesAndThunks/usersSlice/usersSlicePut";
import { deleteUser } from "../../../store/slicesAndThunks/usersSlice/usersSliceDelete";
import { selectAllUsers, selectUsersStatus } from "../../../store/selectors/usersSelectors";
import { openDeleteDialog, closeDeleteDialog } from "../../../store/slicesAndThunks/uiSlice";

const useUsersPageController = () => {
  const dispatch = useDispatch();
  const users = useSelector(selectAllUsers);
  const status = useSelector(selectUsersStatus);
  const { isDeleteOpen, itemToDelete } = useSelector((state) => state.ui);

  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);

  useEffect(() => {
    dispatch(fetchAllUsers());
  }, [dispatch]);

  const filteredUsers = users.filter((u) =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.display_name || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleCreateUser = async (data) => {
    await dispatch(createUser(data));
    setIsCreateOpen(false);
  };

  const handleUpdateUser = async (data) => {
    await dispatch(updateUser({ id: editUser.id, ...data }));
    setEditUser(null);
  };

  const handleDeleteClick = (user) => dispatch(openDeleteDialog({ item: user, type: "user" }));

  const handleDeleteConfirm = async () => {
    await dispatch(deleteUser(itemToDelete.id));
    dispatch(closeDeleteDialog());
  };

  return {
    filteredUsers, status, search, setSearch,
    isCreateOpen, setIsCreateOpen,
    editUser, setEditUser,
    isDeleteOpen, itemToDelete,
    handleCreateUser, handleUpdateUser,
    handleDeleteClick, handleDeleteConfirm,
    closeDeleteDialog: () => dispatch(closeDeleteDialog()),
  };
};

export default useUsersPageController;
