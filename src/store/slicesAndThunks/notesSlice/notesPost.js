import { createApiThunk } from "../../createApiThunk";
import { notesApi } from "../../../api/notesApi";

export const createNote = createApiThunk("notes/create", "Failed to create note", async (payload) => {
  return await notesApi.create(payload);
});
