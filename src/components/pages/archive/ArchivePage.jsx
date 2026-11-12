import { useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import UploadIcon from "@mui/icons-material/Upload";
import ArchiveBrowser from "./componentsArchive/ArchiveBrowser";
import UploadMedia from "../../features/UploadMedia/UploadMedia";
import SmartSearch from "../../features/SmartSearch/SmartSearch";
import useArchivePageController from "./useArchivePageController";
import { useArchiveUpload } from "./useArchiveUpload";

// The filters, the cards and their dialogs are ArchiveBrowser, shared with a
// lecturer's page (PRD ATTR-10). What is only the archive's is here: the
// upload button, the smart-search tab and the picture beside them.
const ArchivePage = () => {
  const archive = useArchivePageController();
  const { user, isUploadOpen, canUpload } = useArchiveUpload();
  const [tab, setTab] = useState(0);

  return (
    <Box sx={{ display: "flex", bgcolor: "background.default", minHeight: "calc(100vh - 64px)" }}>
      {/* Main content */}
      <Box sx={{ flexGrow: 1, p: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
          <Typography variant="h4" fontWeight={800} color="primary">ארכיון מדיה</Typography>
          {canUpload && (
            <Button variant="contained" startIcon={<UploadIcon />} onClick={archive.handleOpenUpload}
              sx={{
                background: "linear-gradient(135deg, #29b6d8 0%, #1597bb 100%)",
                "&:hover": { background: "linear-gradient(135deg, #1ea7ca 0%, #128aab 100%)" },
                borderRadius: 2, fontWeight: 700, px: 3, boxShadow: "0 3px 10px rgba(21,151,187,0.35)",
              }}
            >
              העלאת מדיה
            </Button>
          )}
        </Box>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
          <Tab label="ארכיון" />
          <Tab label="חיפוש עומק חכם" />
        </Tabs>

        {tab === 0 && (
          <ArchiveBrowser archive={archive} user={user} canUpload={canUpload} onOpenUpload={archive.handleOpenUpload} />
        )}

        {tab === 1 && <SmartSearch onOpenResult={archive.handleOpenResult} />}
      </Box>

      {/* Left side image (rendered last so it sits on the left under RTL) */}
      <Box
        component="img"
        src="/images/central_image.png"
        alt=""
        sx={{
          flexShrink: 0,
          width: { xs: 0, md: "24%" },
          display: { xs: "none", md: "block" },
          objectFit: "cover",
          position: "sticky",
          top: 64,
          alignSelf: "flex-start",
          height: "calc(100vh - 64px)",
          borderLeft: "1px solid rgba(0,0,0,0.06)",
          opacity: 0.5,
        }}
      />

      <UploadMedia open={isUploadOpen} />
    </Box>
  );
};

export default ArchivePage;
