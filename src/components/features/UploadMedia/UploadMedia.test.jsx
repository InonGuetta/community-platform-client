// @vitest-environment jsdom
import { test, expect, describe, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import uiReducer, { openUpload } from "../../../store/slicesAndThunks/uiSlice";
import mediaReducer from "../../../store/slicesAndThunks/mediaSlice/mediaSlice";
import coursesReducer from "../../../store/slicesAndThunks/coursesSlice/coursesSlice";
import notificationReducer from "../../../store/slicesAndThunks/notificationSlice";

// Uploading a lesson: what the dialog asks the server for when it opens, the
// form it sends, what happens on success and on failure, and the tag question
// that follows an untagged upload. Only the APIs are replaced.

const mediaApi = vi.hoisted(() => ({
  upload: vi.fn(), update: vi.fn(), creators: vi.fn(), tags: vi.fn(), tagSuggestions: vi.fn(),
}));
const getAllCourses = vi.hoisted(() => vi.fn());

vi.mock("../../../api/mediaApi", () => ({ mediaApi }));
vi.mock("../../../api/coursesApi", () => ({ coursesApi: { getAll: (...a) => getAllCourses(...a) } }));
// The tag question is its own dialog with its own tests; here, only whether it
// is asked and what its two answers do.
vi.mock("../TagPicker/SuggestTagsDialog", () => ({
  default: ({ open, item, suggestions, onSkip, onSave }) => (open ? (
    <div data-testid="suggest" data-item={item?.id} data-count={suggestions.length}>
      <button onClick={onSkip}>skip-tags</button>
      <button onClick={() => onSave(item.id, { tagIds: [3], tags: ["חדש"] })}>save-tags</button>
    </div>
  ) : null),
}));

import UploadMedia from "./UploadMedia";

const renderUpload = () => {
  const store = configureStore({
    reducer: {
      ui: uiReducer, media: mediaReducer, courses: coursesReducer, notification: notificationReducer,
      auth: () => ({ user: { id: 5, role: "lecturer", display_name: "הרב" } }),
    },
  });
  store.dispatch(openUpload());
  render(<Provider store={store}><UploadMedia open /></Provider>);
  return store;
};

const chooseFile = (type = "audio/mpeg", name = "shiur.mp3") => {
  const file = new File(["x"], name, { type });
  fireEvent.change(document.getElementById("media-file-input"), { target: { files: [file] } });
  return file;
};
const typeTitle = (title) => fireEvent.change(screen.getByLabelText(/כותרת/), { target: { value: title } });
const sent = () => Object.fromEntries([...mediaApi.upload.mock.calls[0][0].entries()].map(([k, v]) => [k, typeof v === "string" ? v : v.name]));
const notices = (store) => JSON.stringify(store.getState().notification);

beforeEach(() => {
  vi.clearAllMocks();
  getAllCourses.mockResolvedValue([]);
  mediaApi.creators.mockResolvedValue([{ name: "הרב כהן" }]);
  mediaApi.tags.mockResolvedValue([]);
  mediaApi.upload.mockResolvedValue({ id: 41, title: "שיעור", tags: [] });
  mediaApi.tagSuggestions.mockResolvedValue([{ id: 3, name: "תפילה" }]);
  mediaApi.update.mockImplementation(async (id, payload) => ({ id, ...payload }));
});

test("opening asks for the courses, the creators and the tag tree", async () => {
  renderUpload();
  await waitFor(() => expect(getAllCourses).toHaveBeenCalled());
  expect(mediaApi.creators).toHaveBeenCalled();
  expect(mediaApi.tags).toHaveBeenCalled();
});

describe("sending it", () => {
  test("sends the file with what was typed, its type read off the file, no empty course, and the lecturer credited", async () => {
    renderUpload();
    chooseFile("audio/mpeg");
    typeTitle("שיעור בגמרא");
    fireEvent.click(screen.getByRole("button", { name: "העלאה" }));
    await waitFor(() => expect(mediaApi.upload).toHaveBeenCalled());
    // A lecturer filing into no course is the lesson's lecturer (lecturerIdFor).
    expect(sent()).toEqual({ file: "shiur.mp3", title: "שיעור בגמרא", description: "", mediaType: "audio", lecturerId: "5" });
  });

  test("a success closes the dialog and asks about tags for the untagged lesson", async () => {
    const store = renderUpload();
    chooseFile();
    typeTitle("שיעור");
    fireEvent.click(screen.getByRole("button", { name: "העלאה" }));
    await waitFor(() => expect(mediaApi.tagSuggestions).toHaveBeenCalledWith(41));
    expect(store.getState().ui.isUploadOpen).toBe(false);
    expect(await screen.findByTestId("suggest")).toHaveAttribute("data-item", "41");
    expect(screen.getByTestId("suggest")).toHaveAttribute("data-count", "1");
  });

  test("a failure keeps the dialog, the file and the title, and asks nothing about tags", async () => {
    mediaApi.upload.mockRejectedValue(new Error("413"));
    const store = renderUpload();
    chooseFile();
    typeTitle("שיעור ארוך");
    fireEvent.click(screen.getByRole("button", { name: "העלאה" }));
    await waitFor(() => expect(mediaApi.upload).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByRole("button", { name: "העלאה" })).toBeEnabled());
    expect(store.getState().ui.isUploadOpen).toBe(true);
    expect(screen.getByLabelText(/כותרת/)).toHaveValue("שיעור ארוך");
    expect(mediaApi.tagSuggestions).not.toHaveBeenCalled();
  });
});

describe("the tag question after it", () => {
  const upload = async () => {
    const store = renderUpload();
    chooseFile();
    typeTitle("שיעור");
    fireEvent.click(screen.getByRole("button", { name: "העלאה" }));
    await screen.findByTestId("suggest");
    return store;
  };

  test("saving the tags writes them and says so", async () => {
    const store = await upload();
    fireEvent.click(screen.getByText("save-tags"));
    await waitFor(() => expect(mediaApi.update).toHaveBeenCalledWith(41, { tagIds: [3], tags: ["חדש"] }));
    await waitFor(() => expect(notices(store)).toContain("התגיות נשמרו"));
    await waitFor(() => expect(screen.queryByTestId("suggest")).not.toBeInTheDocument());
  });

  test("a refused save says so and keeps the question open", async () => {
    mediaApi.update.mockRejectedValue(new Error("500"));
    const store = await upload();
    fireEvent.click(screen.getByText("save-tags"));
    await waitFor(() => expect(notices(store)).toMatch(/error/));
    expect(screen.getByTestId("suggest")).toBeInTheDocument();
  });

  test("skipping closes it", async () => {
    await upload();
    fireEvent.click(screen.getByText("skip-tags"));
    expect(screen.queryByTestId("suggest")).not.toBeInTheDocument();
  });
});
