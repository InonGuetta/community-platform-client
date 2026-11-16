import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import ForumIcon from "@mui/icons-material/ForumOutlined";
import ChatPane from "../../features/ChatPane/ChatPane";
import { useTranslation } from "react-i18next";
import useAskArchivePageController, { archiveSuggestions } from "./useAskArchivePageController";

// "Ask the archive" (PRD ASK-2): one question over every lesson the reader may
// see, answered with each part cited to its own lesson.
const AskArchivePage = () => {
  const { t } = useTranslation("chat");
  const c = useAskArchivePageController();
  return (
    <Box sx={{ p: { xs: 1.5, sm: 3 }, display: "flex", justifyContent: "center" }}>
      <Paper
        sx={{
          p: { xs: 2, sm: 3 },
          maxWidth: 860,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 2,
          // A fixed height on a wide screen so the conversation scrolls inside
          // and the question box stays put; a phone scrolls the page instead.
          height: { md: "calc(100vh - 112px)" },
          minHeight: { xs: "70vh", md: 0 },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <ForumIcon color="primary" />
          <Box>
            <Typography variant="h5" component="h1" fontWeight={700}>{t("askArchive.title")}</Typography>
            <Typography variant="body2" color="text.secondary">
              {t("askArchive.subtitle")}
            </Typography>
          </Box>
        </Box>
        <ChatPane chat={c.chat} opener={c.opener} subject="archive" suggestedQuestions={archiveSuggestions()} />
      </Paper>
    </Box>
  );
};

export default AskArchivePage;
