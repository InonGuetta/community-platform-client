import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Dialog from "@mui/material/Dialog";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import LinearProgress from "@mui/material/LinearProgress";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DialogTitle from "../Dialogs/DialogTitle";
import DialogContent from "../Dialogs/DialogContent";
import DialogActions from "../Dialogs/DialogActions";
import ContentFieldsUpload from "./ContentFieldsUpload";
import { uploadMedia } from "../../../store/slicesAndThunks/mediaSlice/mediaPost";
import { closeUpload } from "../../../store/slicesAndThunks/uiSlice";

const UploadMedia = ({ open }) => {
  const dispatch = useDispatch();
  const progress = useSelector((state) => state.ui.uploadProgress);
  const [file, setFile] = useState(null);
  const [fields, setFields] = useState({ title: "", description: "", mediaType: "video" });
  const [uploading, setUploading] = useState(false);

  const handleClose = () => dispatch(closeUpload());

  // Closing mid-upload used to unmount the dialog while the request was still
  // in flight, leaving the user with no idea whether it landed.
  const handleDialogClose = () => {
    if (uploading) return;
    handleClose();
  };

  const handleFieldChange = (key, val) => setFields((prev) => ({ ...prev, [key]: val }));

  const detectMediaType = (file) => {
    if (file.type.startsWith("video/")) return "video";
    if (file.type.startsWith("audio/")) return "audio";
    return "text";
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;
    setFile(selected);
    setFields((prev) => ({ ...prev, mediaType: detectMediaType(selected) }));
  };

  const handleSubmit = async () => {
    if (!file || !fields.title || !fields.mediaType) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", fields.title);
    formData.append("description", fields.description);
    formData.append("mediaType", fields.mediaType);
    const result = await dispatch(uploadMedia(formData));
    setUploading(false);

    // Keep the dialog — and the chosen file and typed title — on failure. The
    // toast says what went wrong; closing would make the user redo all of it.
    if (result.meta.requestStatus !== "fulfilled") return;

    setFile(null);
    setFields({ title: "", description: "", mediaType: "video" });
    handleClose();
  };

  return (
    <Dialog open={open} onClose={handleDialogClose} maxWidth="sm" fullWidth>
      <DialogTitle onClose={handleClose}>העלאת מדיה</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Box
            sx={{
              border: "2px dashed", borderColor: "grey.400", borderRadius: 2,
              p: 3, textAlign: "center", cursor: "pointer",
              "&:hover": { borderColor: "primary.main", bgcolor: "action.hover" },
            }}
            onClick={() => document.getElementById("media-file-input").click()}
          >
            <CloudUploadIcon sx={{ fontSize: 40, color: "grey.500", mb: 1 }} />
            <Typography color="text.secondary">
              {file ? file.name : "לחץ לבחירת קובץ"}
            </Typography>
            <input
              id="media-file-input"
              type="file"
              hidden
              accept="video/*,audio/*,.pdf,.txt,.doc,.docx"
              onChange={handleFileChange}
            />
          </Box>
          <ContentFieldsUpload values={fields} onChange={handleFieldChange} />

          {uploading && (
            <Box>
              <LinearProgress
                variant={progress > 0 ? "determinate" : "indeterminate"}
                value={progress}
                sx={{ borderRadius: 1, height: 8 }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                {progress > 0 && progress < 100
                  ? `מעלה... ${progress}%`
                  : "מעבד בשרת..."}
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} variant="outlined" disabled={uploading}>ביטול</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={uploading || !file}>
          {uploading ? "מעלה..." : "העלאה"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UploadMedia;
