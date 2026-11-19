import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import AddCommentIcon from "@mui/icons-material/AddComment";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ChatPane from "../../features/ChatPane/ChatPane";
import PageHeader from "../../features/PageHeader/PageHeader";
import { DOCK_OFFSET, HEADER_HEIGHT } from "../../layout/shellGeometry";
import { useTranslation } from "react-i18next";
import useAskArchivePageController, { archiveSuggestions } from "./useAskArchivePageController";

// "Ask the archive" (PRD ASK-2): one question over every lesson the reader may
// see, answered with each part cited to its own lesson. The page is a header
// and the chat; the question box floats at the bottom of the screen above the
// dock (screen 09), so the page itself scrolls under a long thread.
//
// "שיחה חדשה" and "העתק שיחה" sit in the header (only once there is a
// conversation), so ChatPane is told not to draw its own pair.
const AskArchivePage = () => {
  const { t } = useTranslation("chat");
  const c = useAskArchivePageController();
  const started = c.chat.messages.length > 0;
  return (
    <Box>
      <PageHeader
        title={t("askArchive.title")}
        subtitle={t("askArchive.subtitle")}
        actions={
          started ? (
            <>
              <Button
                variant="soft"
                startIcon={<AddCommentIcon />}
                onClick={c.chat.startNew}
                disabled={c.chat.asking}
              >
                {t("newChat")}
              </Button>
              {c.chat.copy && (
                // Mid-answer the copy would hold half an answer, or none.
                <Button
                  variant="soft"
                  startIcon={<ContentCopyIcon />}
                  onClick={() => c.chat.copy(c.chat.messages)}
                  disabled={c.chat.asking}
                >
                  {t("copy")}
                </Button>
              )}
            </>
          ) : null
        }
      />
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          minHeight: {
            xs: `calc(100vh - ${HEADER_HEIGHT}px - ${DOCK_OFFSET.xs}px - 240px)`,
            md: `calc(100vh - ${HEADER_HEIGHT}px - ${DOCK_OFFSET.md}px - 280px)`,
          },
        }}
      >
        <ChatPane
          chat={c.chat}
          opener={c.opener}
          subject="archive"
          suggestedQuestions={archiveSuggestions()}
          hideActions
          inputBottom={DOCK_OFFSET}
        />
      </Box>
    </Box>
  );
};

export default AskArchivePage;
