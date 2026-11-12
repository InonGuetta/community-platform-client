import { createApiThunk } from "../../createApiThunk";
import { usersApi } from "../../../api/usersApi";

export const deleteUser = createApiThunk("users/delete", "Failed to delete user", async (id) => {
  await usersApi.remove(id);
  return { id };
});
