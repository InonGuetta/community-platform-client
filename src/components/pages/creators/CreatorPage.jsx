import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Avatar from "@mui/material/Avatar";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import Skeleton from "@mui/material/Skeleton";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ArchiveBrowser from "../archive/componentsArchive/ArchiveBrowser";
import { useCreatorPageController } from "./useCreatorPageController";
import { creatorSummary } from "./creatorSummary";

// A lecturer's page (PRD ATTR-10, ARCH-5): everything under one name — the
// lessons they gave and the books they wrote — with the archive's own filters,
// cards and editing, and the lecturer already chosen.
//
// By NAME, as the archive attributes: a guest speaker has lessons and no
// account, and the name on the lesson is what a reader followed here.
const CreatorPage = () => {
  const c = useCreatorPageController();
  const p = c.profile;

  return (
    <Box sx={{ bgcolor: "background.default", minHeight: "calc(100vh - 64px)", p: 3 }}>
      <Button size="small" startIcon={<ArrowForwardIcon />} onClick={c.goToArchive} sx={{ mb: 2 }}>
        לארכיון
      </Button>

      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3, flexWrap: "wrap" }}>
        <Avatar sx={{ width: 64, height: 64, bgcolor: "primary.main", fontSize: 28, fontWeight: 800 }} aria-hidden>
          {c.name.trim().replace(/^הרב\s+/, "").slice(0, 1)}
        </Avatar>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="h4" fontWeight={800} color="primary" sx={{ wordBreak: "break-word" }}>
            {c.name}
          </Typography>
          {c.profileStatus === "loading" && <Skeleton width={280} />}
          {p && (
            <Typography variant="body1" color="text.secondary" data-testid="creator-summary">
              {creatorSummary(p)}
            </Typography>
          )}
          {c.profileStatus === "failed" && (
            <Typography variant="body1" color="text.secondary">
              לא נמצאו שיעורים בשם הזה שפתוחים לך.
            </Typography>
          )}
          {p?.courses?.length > 0 && (
            <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mt: 1 }}>
              {p.courses.map((course) => (
                <Chip key={course.id} label={course.title} size="small" color="primary" variant="outlined" />
              ))}
            </Box>
          )}
        </Box>
      </Box>

      <ArchiveBrowser archive={c.archive} user={c.user} canUpload={c.canUpload} chooseCreator={false} />
    </Box>
  );
};

export default CreatorPage;
