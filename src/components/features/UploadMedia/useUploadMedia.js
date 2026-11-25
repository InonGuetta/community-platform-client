import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { uploadMedia } from "../../../store/slicesAndThunks/mediaSlice/mediaPost";
import { updateMedia } from "../../../store/slicesAndThunks/mediaSlice/mediaPut";
import { closeUpload } from "../../../store/slicesAndThunks/uiSlice";
import { notify } from "../../../store/slicesAndThunks/snackbarSlice";
import { fetchAllCourses } from "../../../store/slicesAndThunks/coursesSlice/coursesGet";
import { mediaApi } from "../../../api/mediaApi";
import { selectAssignableCourses } from "../../../store/selectors/coursesSelectors";
import { selectUser } from "../../../store/selectors/authSelectors";
import { lecturerIdFor } from "./lessonFields";
import { selectUploadProgress } from "../../../store/selectors/uiSelectors";
import { messageForError } from "../../../utilities/apiError";
import { useTranslation } from "react-i18next";

// What the upload dialog does — what it loads when it opens, the form it
// sends, and the tag question after an untagged upload — so that
// UploadMedia.jsx is layout only.

// creatorName starts empty on purpose rather than pre-filled with "כללי": the
// placeholder says what blank will become, and pre-filling would make the
// default look like something the uploader chose.
const EMPTY_FIELDS = { title: "", description: "", mediaType: "video", courseId: "", creatorName: "", tags: [] };

// The type a file is filed as, read off its MIME type. A browser that reports no
// type for an audio or video file (some do for less common containers) falls
// back to the extension; anything else — a PDF, a Word file, plain text — is a
// text item. The person can change the answer in the form (UI_UX_FIXES 4.12).
const AUDIO_EXTENSION = /\.(mp3|m4a|wav|ogg|oga|aac|flac|opus)$/i;
const VIDEO_EXTENSION = /\.(mp4|m4v|mov|webm|mkv|avi)$/i;
const detectMediaType = (file) => {
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  if (!file.type && AUDIO_EXTENSION.test(file.name)) return "audio";
  if (!file.type && VIDEO_EXTENSION.test(file.name)) return "video";
  return "text";
};

/**
 * @param {{ open: boolean }} props
 */
export const useUploadMedia = ({ open }) => {
  const { t } = useTranslation("upload");
  const dispatch = useDispatch();
  const progress = useSelector(selectUploadProgress);
  // Only the courses this user may file into — the server refuses the others.
  const courses = useSelector(selectAssignableCourses);
  const user = useSelector(selectUser);
  // Derived from media already in the store — no request, and no new endpoint.
  // From the creators endpoint, not from the media in the store: the archive
  // filters server-side now, so the rows it holds are a filtered subset and the
  // suggestions would silently narrow to whatever the archive happened to be
  // showing when the dialog opened.
  const [knownCreators, setKnownCreators] = useState([]);
  // Fetched rather than derived: unlike creators, a tag can exist in the
  // vocabulary before any item the archive has loaded carries it.
  const [knownTags, setKnownTags] = useState([]);
  const [file, setFile] = useState(null);
  const [fields, setFields] = useState(EMPTY_FIELDS);
  const [uploading, setUploading] = useState(false);
  // The item that has just been stored, and what the server thinks it is about.
  // Held here rather than in the archive because this is the flow that produced
  // it: the upload succeeded, and the question that follows belongs to the same
  // gesture.
  const [justUploaded, setJustUploaded] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [savingTags, setSavingTags] = useState(false);

  // Only when the dialog opens: the archive page itself has no use for the
  // course list, and fetching on mount would pay for it on every visit.
  useEffect(() => {
    if (open) dispatch(fetchAllCourses());
  }, [open, dispatch]);

  // Only when the dialog opens, like the course list — and silent on failure:
  // an autocomplete with no suggestions still accepts a new tag, so a toast
  // would report a problem the user does not have.
  useEffect(() => {
    if (!open) return;
    mediaApi
      .creators()
      .then((rows) => setKnownCreators(rows.map((r) => r.name)))
      .catch(() => setKnownCreators([]));

    mediaApi
      .tags()
      // The tree as it comes. Flattening it into pickable options — with the
      // PATH that tells the two "שופטים" apart — belongs to the picker, which
      // is shared with the edit dialog.
      .then(setKnownTags)
      .catch(() => setKnownTags([]));
  }, [open]);

  const handleClose = () => dispatch(closeUpload());

  // Closing mid-upload used to unmount the dialog while the request was still
  // in flight, leaving the user with no idea whether it landed.
  const handleDialogClose = () => {
    if (uploading) return;
    handleClose();
  };

  // True while the type is what was read off the file; the person changing it
  // by hand turns the note off (UI_UX_FIXES 4.12).
  const [typeAuto, setTypeAuto] = useState(false);
  // A file is being dragged over the drop area.
  const [dragging, setDragging] = useState(false);

  const handleFieldChange = (key, val) => {
    if (key === "mediaType") setTypeAuto(false);
    setFields((prev) => ({ ...prev, [key]: val }));
  };

  // The same kinds the file input offers (its `accept`): a drop is not
  // filtered by the browser, so it is checked here.
  const isAcceptable = (picked) =>
    /^(video|audio)\//.test(picked.type) || /\.(pdf|txt|doc|docx)$/i.test(picked.name);

  const pickFile = (selected) => {
    setFile(selected);
    setFields((prev) => ({ ...prev, mediaType: detectMediaType(selected) }));
    setTypeAuto(true);
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;
    pickFile(selected);
  };

  const dropProps = {
    onDragOver: (e) => {
      e.preventDefault();
      setDragging(true);
    },
    onDragLeave: () => setDragging(false),
    onDrop: (e) => {
      e.preventDefault();
      setDragging(false);
      if (uploading) return;
      const dropped = e.dataTransfer?.files?.[0];
      if (!dropped) return;
      if (!isAcceptable(dropped)) {
        dispatch(notify({ message: t("notAllowed"), severity: "warning" }));
        return;
      }
      pickFile(dropped);
    },
  };

  const handleSubmit = async () => {
    if (!file || !fields.title || !fields.mediaType) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", fields.title);
    formData.append("description", fields.description);
    formData.append("mediaType", fields.mediaType);
    // Omitted entirely when no course is chosen: FormData stringifies, so an
    // empty selection would arrive as the string "" and fail optionalId.
    if (fields.courseId) formData.append("courseId", fields.courseId);
    // The account the lesson credits — see lecturerIdFor. Omitted, like the
    // course, when there is nobody to name.
    const lecturerId = lecturerIdFor(user, courses.find((c) => String(c.id) === String(fields.courseId)));
    if (lecturerId !== undefined) formData.append("lecturerId", lecturerId);
    // Sent only when the uploader typed something. Omitting the key is what lets
    // the server apply its own default, so blank here and absent here cannot
    // produce different rows.
    if (fields.creatorName.trim()) formData.append("creatorName", fields.creatorName.trim());
    // A picked tag is an OBJECT from the taxonomy and travels as its id; a typed
    // one is a plain STRING and travels as a name. The id is what disambiguates
    // the five names that occur in two branches — a name could not say which was
    // meant. Appended one at a time because multipart has no array type.
    fields.tags.forEach((tag) => {
      if (typeof tag === "string") formData.append("tags", tag);
      else formData.append("tagIds", tag.id);
    });
    const result = await dispatch(uploadMedia(formData));
    setUploading(false);

    // Keep the dialog — and the chosen file and typed title — on failure. The
    // toast says what went wrong; closing would make the user redo all of it.
    if (result.meta.requestStatus !== "fulfilled") return;

    const created = result.payload;
    setFile(null);
    setFields(EMPTY_FIELDS);
    handleClose();

    // Asked only of an item that arrived untagged. Somebody who already said what
    // it is about does not need to be asked again, and a dialog that opens after
    // every upload regardless is one people learn to dismiss without reading.
    if (!created?.id || fields.tags.length > 0) return;
    // Silent on failure: the item is stored and the tagging is an offer. An error
    // toast about a suggestion nobody asked for would report a problem the user
    // does not have.
    const offered = await mediaApi.tagSuggestions(created.id).catch(() => []);
    setSuggestions(offered);
    setJustUploaded(created);
  };

  const handleSkipTags = () => {
    setJustUploaded(null);
    setSuggestions([]);
  };

  const handleSaveTags = async (id, { tagIds, tags }) => {
    setSavingTags(true);
    const result = await dispatch(updateMedia({ id, tagIds, tags }));
    setSavingTags(false);
    dispatch(
      notify(
        result.meta.requestStatus === "fulfilled"
          ? { message: t("tagsSaved"), severity: "success" }
          : { message: messageForError(result.payload, t("tagsFailed")), severity: "error" }
      )
    );
    if (result.meta.requestStatus === "fulfilled") handleSkipTags();
  };

  return {
    progress, courses, knownCreators, knownTags, file, fields, uploading,
    justUploaded, suggestions, savingTags, typeAuto, dragging, dropProps,
    handleClose, handleDialogClose, handleFieldChange, handleFileChange, handleSubmit,
    handleSkipTags, handleSaveTags,
  };
};
