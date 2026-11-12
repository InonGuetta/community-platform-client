import { createApiThunk } from "../../createApiThunk";
import { transcriptsApi } from "../../../api/transcriptsApi";

export const updateTranscript = createApiThunk("transcript/update", "Update failed", async ({ mediaId, ...payload }) => {
  return await transcriptsApi.update(mediaId, payload);
});

export const fixHebrewTranscript = createApiThunk("transcript/fixHebrew", "Hebrew correction failed", async (mediaId) => {
  return await transcriptsApi.fixHebrew(mediaId);
});

export const generateKeyPointHeadings = createApiThunk("transcript/keyPointHeadings", "Failed to generate headings", async (mediaId) => {
  return await transcriptsApi.keyPointHeadings(mediaId);
});

export const triggerTranscriptPipeline = createApiThunk("transcript/trigger", "Pipeline trigger failed", async (mediaId) => {
  return await transcriptsApi.trigger(mediaId);
});
