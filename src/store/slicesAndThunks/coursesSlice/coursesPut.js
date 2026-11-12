import { createApiThunk } from "../../createApiThunk";
import { coursesApi } from "../../../api/coursesApi";

export const updateCourse = createApiThunk(
  "courses/update", "Failed to update course",
  async ({ id, ...payload }) => {
    return await coursesApi.update(id, payload);
  }
);
