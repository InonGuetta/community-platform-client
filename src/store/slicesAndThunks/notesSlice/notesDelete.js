import { createApiThunk } from "../../createApiThunk";
import { notesApi } from "../../../api/notesApi";

export const deleteNote = createApiThunk("notes/delete", "Failed to delete note", async (id) => {
  await notesApi.remove(id);
  return { id };
});
