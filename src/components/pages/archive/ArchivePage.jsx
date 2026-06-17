import { useState } from "react";
import { useSelector } from "react-redux";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import UploadIcon from "@mui/icons-material/Upload";
import FilterBar from "./componentsArchive/FilterBar";
import MediaGrid from "./componentsArchive/MediaGrid";
import UploadMedia from "../../features/UploadMedia/UploadMedia";
import SmartSearch from "../../features/SmartSearch/SmartSearch";
import ConfirmingDeletionDialog from "../../features/ConfirmingDeletionDialog/ConfirmingDeletionDialog";
import useArchivePageController from "./useArchivePageController";
import { selectUser } from "../../../store/selectors/authSelectors";
import { roles } from "../../../utilities/constant";

const ArchivePage = () => {
  const {
    filteredMedia, status, typeFilter,
    handleFilter, handleSearch, handleOpenMedia, handleOpenUpload, handleOpenResult,
    deleteTargetId, handleDeleteRequest, handleDeleteCancel, handleDeleteConfirm,
  } = useArchivePageController();
  const { isUploadOpen } = useSelector((state) => state.ui);
  const user = useSelector(selectUser);
  const [tab, setTab] = useState(0);

  const deleteTarget = filteredMedia.find((i) => i.id === deleteTargetId);

  return (
    <Box sx={{ display: "flex", bgcolor: "background.default", minHeight: "calc(100vh - 64px)" }}>
      {/* Left side image */}
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
          borderRight: "1px solid rgba(0,0,0,0.06)",
        }}
      />

      {/* Main content */}
      <Box sx={{ flexGrow: 1, p: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
          <Typography variant="h4" fontWeight={800} color="primary">Media Archive</Typography>
          {(user?.role === roles.lecturer || user?.role === roles.admin) && (
            <Button variant="contained" startIcon={<UploadIcon />} onClick={handleOpenUpload}
              sx={{
                background: "linear-gradient(135deg, #29b6d8 0%, #1597bb 100%)",
                "&:hover": { background: "linear-gradient(135deg, #1ea7ca 0%, #128aab 100%)" },
                borderRadius: 2, fontWeight: 700, px: 3, boxShadow: "0 3px 10px rgba(21,151,187,0.35)",
              }}
            >
              Upload Media
            </Button>
          )}
        </Box>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
          <Tab label="ארכיון" />
          <Tab label="Smart Deep Search" />
        </Tabs>

        {tab === 0 && (
          <>
            <Box sx={{ mb: 3 }}>
              <FilterBar typeFilter={typeFilter} onFilter={handleFilter} onSearch={handleSearch} />
            </Box>
            <MediaGrid items={filteredMedia} status={status} onView={handleOpenMedia} user={user} onDelete={handleDeleteRequest} />
          </>
        )}

        {tab === 1 && <SmartSearch onOpenResult={handleOpenResult} />}
      </Box>

      <UploadMedia open={isUploadOpen} />

      <ConfirmingDeletionDialog
        open={!!deleteTargetId}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        itemName={deleteTarget?.title}
        type="media"
      />
    </Box>
  );
};

export default ArchivePage;
