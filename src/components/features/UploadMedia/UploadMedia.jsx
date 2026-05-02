import { useState } from "react";
import { useDispatch } from "react-redux";
import Dialog from "@mui/material/Dialog";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DialogTitle from "../Dialogs/DialogTitle";
import DialogContent from "../Dialogs/DialogContent";
import DialogActions from "../Dialogs/DialogActions";
import ContentFieldsUpload from "./ContentFieldsUpload";
import { uploadMedia } from "../../../store/slicesAndThunks/mediaSlice/mediaPost";
import { closeUpload } from "../../../store/slicesAndThunks/uiSlice";

const UploadMedia = ({ open }) => {
  const dispatch = useDispatch();
  const [file, setFile] = useState(null);
  const [fields, setFields] = useState({ title: "", description: "", mediaType: "video" });
  const [uploading, setUploading] = useState(false);

  const handleClose = () => dispatch(closeUpload());

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
    await dispatch(uploadMedia(formData));
    setUploading(false);
    setFile(null);
    setFields({ title: "", description: "", mediaType: "video" });
    handleClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle onClose={handleClose}>Upload Media</DialogTitle>
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
              {file ? file.name : "Click to select a file"}
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
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} variant="outlined">Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={uploading || !file}>
          {uploading ? "Uploading..." : "Upload"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UploadMedia;
