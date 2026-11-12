import { createApiThunk } from "../../createApiThunk";
import { usersApi } from "../../../api/usersApi";

export const fetchAllUsers = createApiThunk("users/fetchAll", "Failed to fetch users", async () => {
  return await usersApi.getAll();
});

export const fetchUserById = createApiThunk("users/fetchById", "Failed to fetch user", async (id) => {
  return await usersApi.getOne(id);
});
