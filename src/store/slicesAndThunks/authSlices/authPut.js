import { createAsyncThunk } from "@reduxjs/toolkit";
import { authApi } from "../../../api/authApi";
import { rejectionOf } from "../../../utilities/apiError";

// The user editing their own row — the only write they make to it.
//
// Its own file rather than joining authPost, following the one-file-per-HTTP-verb
// convention the store uses everywhere else. PATCH rather than PUT because the
// body describes a change to two fields, not a replacement of the account.
export const updateProfile = createAsyncThunk("auth/updateProfile", async (payload, { rejectWithValue }) => {
  try {
    return await authApi.updateProfile(payload);
  } catch (err) {
    return rejectWithValue(rejectionOf(err, "Could not save your profile"));
  }
});
