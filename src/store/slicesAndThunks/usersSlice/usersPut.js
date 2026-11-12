import { createApiThunk } from "../../createApiThunk";
import { usersApi } from "../../../api/usersApi";

export const updateUser = createApiThunk("users/update", "Failed to update user", async ({ id, ...payload }) => {
  return await usersApi.update(id, payload);
});
