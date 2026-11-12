import { createApiThunk } from "../../createApiThunk";
import { authApi } from "../../../api/authApi";

export const fetchMe = createApiThunk("auth/fetchMe", "Failed to fetch user", async () => {
  return await authApi.me();
});
