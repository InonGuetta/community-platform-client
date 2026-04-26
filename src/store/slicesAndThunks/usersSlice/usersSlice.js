import { createSlice } from "@reduxjs/toolkit";
import { fetchAllUsers, fetchUserById } from "./usersSliceGet";
import { createUser } from "./usersSlicePost";
import { updateUser } from "./usersSlicePut";
import { deleteUser } from "./usersSliceDelete";
import { statuses } from "../../../utilities/constant";

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
      .addCase(fetchAllUsers.rejected, (state, action) => { state.status = statuses.failed; state.error = action.payload; })

      .addCase(fetchUserById.fulfilled, (state, action) => { state.selectedUser = action.payload; })

      .addCase(createUser.fulfilled, (state, action) => { state.items.unshift(action.payload); })

      .addCase(updateUser.fulfilled, (state, action) => {
        const idx = state.items.findIndex((u) => u.id === action.payload.id);
        if (idx !== -1) state.items[idx] = action.payload;
      })

      .addCase(deleteUser.fulfilled, (state, action) => {
        const idx = state.items.findIndex((u) => u.id === action.payload.id);
        if (idx !== -1) state.items[idx] = { ...state.items[idx], is_active: false };
      });
  },
});

export const { clearSelectedUser, clearError } = usersSlice.actions;
export default usersSlice.reducer;
