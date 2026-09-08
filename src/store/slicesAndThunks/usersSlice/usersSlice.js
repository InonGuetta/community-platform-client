import { createSlice } from "@reduxjs/toolkit";
import { fetchAllUsers, fetchUserById } from "./usersSliceGet";
import { createUser, approveUser, rejectUser } from "./usersSlicePost";
import { updateUser } from "./usersSlicePut";
import { deleteUser } from "./usersSliceDelete";
import { statuses } from "../../../utilities/constant";

// The decision endpoints return only the columns they touched, so the stored row
// is MERGED rather than replaced: overwriting would drop is_active, avatar_url
// and created_at from the table the moment somebody was approved.
const replaceUser = (state, action) => {
  const i = state.items.findIndex((u) => u.id === action.payload.id);
  if (i !== -1) state.items[i] = { ...state.items[i], ...action.payload };
};

const usersSlice = createSlice({
  name: "users",
  initialState: { items: [], selectedUser: null, status: statuses.idle, error: null },
  reducers: {
    clearSelectedUser(state) { state.selectedUser = null; },
    clearError(state) { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllUsers.pending, (state) => { state.status = statuses.loading; })
      .addCase(fetchAllUsers.fulfilled, (state, action) => { state.status = statuses.succeeded; state.items = action.payload; })
      .addCase(fetchAllUsers.rejected, (state, action) => { state.status = statuses.failed; state.error = action.payload?.message; })

      .addCase(fetchUserById.fulfilled, (state, action) => { state.selectedUser = action.payload; })

      .addCase(createUser.fulfilled, (state, action) => { state.items.unshift(action.payload); })

      .addCase(updateUser.fulfilled, (state, action) => {
        const idx = state.items.findIndex((u) => u.id === action.payload.id);
        if (idx !== -1) state.items[idx] = action.payload;
      })

      .addCase(deleteUser.fulfilled, (state, action) => {
        state.items = state.items.filter((u) => u.id !== action.payload.id);
      })
      .addCase(deleteUser.rejected, (state, action) => { state.error = action.payload?.message; })

      // A decision replaces the row in place rather than triggering a refetch.
      // The waiting list and the table are two views of the SAME array, so
      // refetching would leave the account visible in both until it landed.
      .addCase(approveUser.fulfilled, replaceUser)
      .addCase(rejectUser.fulfilled, replaceUser)
      .addCase(approveUser.rejected, (state, action) => { state.error = action.payload?.message; })
      .addCase(rejectUser.rejected, (state, action) => { state.error = action.payload?.message; });
  },
});

export const { clearSelectedUser, clearError } = usersSlice.actions;
export default usersSlice.reducer;
