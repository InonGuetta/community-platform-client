import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import axiosInstance from "../../../../utilities/axiosInstance";

const TextViewer = ({ mediaId }) => {
  const [blobUrl, setBlobUrl] = useState(null);

  useEffect(() => {
    let url;
    axiosInstance.get(`/media/${mediaId}/stream`, { responseType: "blob" }).then(({ data }) => {
      url = URL.createObjectURL(data);
      setBlobUrl(url);
    });
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [mediaId]);

  if (!blobUrl) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      component="iframe"
      src={blobUrl}
      width="100%"
      height={650}
      sx={{ border: "none", borderRadius: 2, display: "block" }}
    />
  );
};

export default TextViewer;
