import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import useAIDiscussionController, { DISCUSSION_MODES } from "../../useAIDiscussionController";
import SmartSearchPane from "./SmartSearchPane";
import ChatPane from "../../../../features/ChatPane/ChatPane";
import HistoryPane from "./HistoryPane";
import TextQualityNotice from "../TextQualityNotice";
import { useTranslation } from "react-i18next";
import { questionsIn } from "../../../../../utilities/suggestedQuestions";

// The "דיון עם AI" tab: three ways into THIS lesson, side by side.
//
//   חיפוש חכם               passages from the lesson, nothing generated — cheap,
//                           fast, and cannot put words in the lecturer's mouth
//   דיון עם בינה מלאכותית   a conversation, answered only from the lesson's
//                           own text, every claim citing the passage it rests on
//   היסטוריה                the reader's earlier conversations on the lesson —
//                           read again, continued, or deleted
//
// Any cited answer, in the chat or in the history, can be saved as a note in
// the lesson's notebook, its sources as chips (utilities/discussionNote.js).
//
// Owns its dispatches through useAIDiscussionController, the same arrangement
// as LessonNotebook: the media page only has to place it.

// Said instead of the panes while there is nothing to discuss. Each names what
// the student can do, which differs: wait, ask the lecturer, or nothing at all.
// The words are discussion.notReady.<readiness>.
const NOT_READY_SEVERITY = { processing: "info", error: "warning", empty: "info", unavailable: "warning" };

// The line under the switch: what the chosen mode covers.
// A whole sentence per mode and per kind of source (context: lesson | book),
// so no translation has to glue "the book" into a sentence built for a lesson.
const caption = (t, mode, isText) => {
  const key = mode === DISCUSSION_MODES.search ? "search" : mode === DISCUSSION_MODES.history ? "history" : "chat";
  return t(`discussion.caption.${key}`, { context: isText ? "book" : "lesson" });
};

const AIDiscussionPanel = ({ mediaId, media, transcript, isText = false, onSeek, onOpenPage }) => {
  const { t, i18n } = useTranslation("lesson");
  const { mode, setMode, readiness, search, chat, history, notebook } = useAIDiscussionController({ mediaId, transcript, media });

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, height: "100%" }}>
      <ToggleButtonGroup
        value={mode}
        exclusive
        fullWidth
        size="small"
        color="primary"
        // An exclusive group reports null when the active button is pressed
        // again; that is not a mode, so it is ignored rather than stored.
        onChange={(_, next) => next && setMode(next)}
        aria-label={t("discussion.modes")}
        // MUI joins grouped buttons with margin-left: -1px, which assumes
        // left-to-right. In this right-to-left page that pushed the second
        // button 1px past the panel's edge and gave the tab a horizontal
        // scrollbar. The logical property overlaps the borders on whichever
        // side the page reads from.
        sx={{
          "& .MuiToggleButtonGroup-grouped:not(:first-of-type)": {
            // eslint-disable-next-line no-restricted-syntax -- zeroes MUI's own physical margin
            marginLeft: 0,
            marginInlineStart: "-1px",
          },
          // Three labels share a third of the page; let a long one wrap
          // rather than push the group wider than the panel.
          "& .MuiToggleButton-root": { lineHeight: 1.3, px: 1 },
        }}
      >
        {/* In this order in the DOM, and so in reading order on the screen:
            the history sits after the discussion, where it was asked. */}
        <ToggleButton value={DISCUSSION_MODES.search}>{t("discussion.search")}</ToggleButton>
        <ToggleButton value={DISCUSSION_MODES.chat}>{t("discussion.chat")}</ToggleButton>
        <ToggleButton value={DISCUSSION_MODES.history}>{t("discussion.history")}</ToggleButton>
      </ToggleButtonGroup>

      {readiness !== "ready" ? (
        <Alert severity={NOT_READY_SEVERITY[readiness]} data-testid="discussion-not-ready">
          {t(`discussion.notReady.${readiness}`)}
        </Alert>
      ) : (
        <>
          {/* The search and the chat know only what reads — said where they
              are used, not only on the summary tab. */}
          {isText && <TextQualityNotice quality={transcript?.text_quality} />}
          <Typography variant="caption" color="text.secondary">{caption(t, mode, isText)}</Typography>
          {mode === DISCUSSION_MODES.search && (
            <SmartSearchPane search={search} isText={isText} onSeek={onSeek} onOpenPage={onOpenPage} />
          )}
          {mode === DISCUSSION_MODES.chat && (
            <ChatPane
              chat={chat}
              notebook={notebook}
              isText={isText}
              onSeek={onSeek}
              onOpenPage={onOpenPage}
              // This lesson's own starting questions (PRD ASK-7), in the
              // reader's language — or the fixed ones in it, when this lesson
              // has none in that language yet.
              suggestedQuestions={questionsIn(transcript?.suggested_questions, i18n.language)}
            />
          )}
          {mode === DISCUSSION_MODES.history && (
            <HistoryPane history={history} notebook={notebook} isText={isText} onSeek={onSeek} onOpenPage={onOpenPage} />
          )}
        </>
      )}
    </Box>
  );
};

export default AIDiscussionPanel;
