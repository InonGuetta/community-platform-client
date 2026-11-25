import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Skeleton from "@mui/material/Skeleton";
import BackLink from "../../features/BackLink/BackLink";
import { SHELL } from "../../../theme/tokens";
import ArchiveBrowser from "../archive/componentsArchive/ArchiveBrowser";
import { useCreatorPageController } from "./useCreatorPageController";
import { creatorSummary } from "./creatorSummary";
import { useTranslation } from "react-i18next";

// A lecturer's page (PRD ATTR-10, ARCH-5): everything under one name — the
// lessons they gave and the books they wrote — with the archive's own filters,
// cards and editing, and the lecturer already chosen.
//
// By NAME, as the archive attributes: a guest speaker has lessons and no
// account, and the name on the lesson is what a reader followed here.
const CreatorPage = () => {
  const { t } = useTranslation("creators");
  const c = useCreatorPageController();
  const p = c.profile;

  return (
    <>
      <BackLink onClick={c.goToArchive} sx={{ mb: 3 }}>
        {t("toArchive")}
      </BackLink>

      <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 2.5, md: 3 }, mb: 5 }}>
        <Box
          aria-hidden
          sx={{
            width: { xs: 96, md: 112 },
            height: { xs: 96, md: 112 },
            flexShrink: 0,
            borderRadius: "50%",
            background: SHELL.drawerAvatar,
            color: "common.white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography variant="display" component="span" sx={{ fontSize: 44 }}>
            {c.name.trim().replace(/^הרב\s+/, "").slice(0, 1)}
          </Typography>
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="display" component="h1" dir="auto" sx={{ fontSize: { xs: 40, md: 64 }, overflowWrap: "anywhere" }}>
            {c.name}
          </Typography>
          {c.profileStatus === "loading" && <Skeleton width={280} />}
          {p && (
            <Typography data-testid="creator-summary" sx={{ mt: 0.5, fontSize: 15, fontWeight: 500, color: "text.secondary" }}>
              {creatorSummary(p)}
            </Typography>
          )}
          {c.profileStatus === "failed" && (
            <Typography sx={{ mt: 0.5, fontSize: 15, fontWeight: 500, color: "text.secondary" }}>
              {t("none")}
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
    </>
  );
};

export default CreatorPage;
