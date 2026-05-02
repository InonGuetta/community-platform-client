import { useSelector } from "react-redux";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import UploadIcon from "@mui/icons-material/Upload";
import FilterBar from "./componentsArchive/FilterBar";
import MediaGrid from "./componentsArchive/MediaGrid";
import UploadMedia from "../../features/UploadMedia/UploadMedia";
import ConfirmingDeletionDialog from "../../features/ConfirmingDeletionDialog/ConfirmingDeletionDialog";
import useArchivePageController from "./useArchivePageController";
import { selectUser } from "../../../store/selectors/authSelectors";
import { roles } from "../../../utilities/constant";

const ArchivePage = () => {
  const {
    filteredMedia, status, typeFilter,
    handleFilter, handleSearch, handleOpenMedia, handleOpenUpload,
    deleteTargetId, handleDeleteRequest, handleDeleteCancel, handleDeleteConfirm,
  } = useArchivePageController();
  const { isUploadOpen } = useSelector((state) => state.ui);
  const user = useSelector(selectUser);

  const deleteTarget = filteredMedia.find((i) => i.id === deleteTargetId);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Media Archive</Typography>
        {(user?.role === roles.lecturer || user?.role === roles.admin) && (
          <Button variant="contained" startIcon={<UploadIcon />} onClick={handleOpenUpload}>
            Upload Media
          </Button>
        )}
      </Box>

      <Box sx={{ mb: 3 }}>
        <FilterBar typeFilter={typeFilter} onFilter={handleFilter} onSearch={handleSearch} />
      </Box>

      <MediaGrid items={filteredMedia} status={status} onView={handleOpenMedia} user={user} onDelete={handleDeleteRequest} />

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
