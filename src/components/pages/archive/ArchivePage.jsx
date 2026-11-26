import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import PageHeader from "../../features/PageHeader/PageHeader";
import ArchiveBrowser from "./componentsArchive/ArchiveBrowser";
import ArchiveGreeting from "./componentsArchive/ArchiveGreeting";
import ArchiveHero from "./componentsArchive/ArchiveHero";
import UploadMedia from "../../features/UploadMedia/UploadMedia";
import SmartSearch from "../../features/SmartSearch/SmartSearch";
import useArchivePageController from "./useArchivePageController";
import { useArchiveUpload } from "./useArchiveUpload";
import { useArchiveHero } from "./useArchiveHero";
import { useTranslation } from "react-i18next";

// The archive (mockup 02), in the order decision 1 fixes:
//   1. the page header — the greeting as its kicker, the title, the subtitle,
//      and "העלאת מדיה" (admin-only; useArchiveUpload);
//   2. the tabs ארכיון / חיפוש עומק חכם (03);
//   3. on the archive tab, the banner — where the reader left off, else the newest published lesson — only
//      while nothing narrows or reorders the list (featuredItem.js);
//   4–7. the toolbar, the filter panel (29), "כל הפריטים" with its count, and
//      the grid — ArchiveBrowser, shared with a lecturer's page (PRD ATTR-10).
//
// The page sits in App's PageContainer, which gives it its width and padding.
const ArchivePage = () => {
  const { t } = useTranslation("archive");
  const archive = useArchivePageController();
  const { user, isUploadOpen, canUpload } = useArchiveUpload();
  const [tab, setTab] = useState(0);
  const hero = useArchiveHero({
    active: tab === 0,
    items: archive.filteredMedia,
    hasActiveFilter: archive.hasActiveFilter,
    sortOrder: archive.sortOrder,
  });

  return (
    <Box>
      <PageHeader
        size="archive"
        kicker={<ArchiveGreeting name={user?.display_name?.trim()} />}
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          canUpload && (
            <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={archive.handleOpenUpload}>
              {t("upload")}
            </Button>
          )
        }
      />

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: { xs: 3, md: 4 } }}>
        <Tab label={t("tabs.archive")} />
        <Tab label={t("tabs.smartSearch")} />
      </Tabs>

      {hero && <ArchiveHero item={hero.item} resuming={hero.resuming} onOpen={archive.handleOpenMedia} onPlay={hero.play} />}

      {tab === 0 && (
        <ArchiveBrowser archive={archive} user={user} canUpload={canUpload} onOpenUpload={archive.handleOpenUpload} />
      )}

      {tab === 1 && <SmartSearch onOpenResult={archive.handleOpenResult} />}

      <UploadMedia open={isUploadOpen} />
    </Box>
  );
};

export default ArchivePage;
