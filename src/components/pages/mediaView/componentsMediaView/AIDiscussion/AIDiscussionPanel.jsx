import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import useAIDiscussionController, { DISCUSSION_MODES } from "../../useAIDiscussionController";
import SmartSearchPane from "./SmartSearchPane";
import ChatPane from "./ChatPane";
import HistoryPane from "./HistoryPane";
import TextQualityNotice from "../TextQualityNotice";

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
const NOT_READY = {
  processing: { severity: "info", text: "השיעור עדיין בעיבוד. אפשר יהיה לחפש בו ולשוחח עליו כשהעיבוד יסתיים." },
  error: { severity: "warning", text: "עיבוד השיעור נכשל, ולכן אין עדיין טקסט לדון בו. המרצה יכול להפעיל את העיבוד מחדש." },
  empty: { severity: "info", text: "לשיעור הזה עדיין אין תמלול או טקסט, ולכן אין על מה לחפש או לשוחח." },
  unavailable: { severity: "warning", text: "לא הצלחנו לטעון את טקסט השיעור. נסה לרענן את העמוד." },
};

// The line under the switch: what the chosen mode covers.
const caption = (mode, isText) => {
  const source = isText ? "הספר" : "השיעור";
  if (mode === DISCUSSION_MODES.search) return `חיפוש לפי משמעות בתוך ${source} הזה בלבד`;
  if (mode === DISCUSSION_MODES.history) return `השיחות הקודמות שלך על ${source} הזה`;
  return `התשובות מבוססות על ${source} הזה בלבד, עם הפניה למקור`;
};

const AIDiscussionPanel = ({ mediaId, media, transcript, isText = false, onSeek, onOpenPage }) => {
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
        aria-label="סוג הדיון"
        // MUI joins grouped buttons with margin-left: -1px, which assumes
        // left-to-right. In this right-to-left page that pushed the second
        // button 1px past the panel's edge and gave the tab a horizontal
        // scrollbar. The logical property overlaps the borders on whichever
        // side the page reads from.
        sx={{
          "& .MuiToggleButtonGroup-grouped:not(:first-of-type)": {
            marginLeft: 0,
            marginInlineStart: "-1px",
          },
          // Three labels share a third of the page; let a long one wrap
          // rather than push the group wider than the panel.
          "& .MuiToggleButton-root": { lineHeight: 1.3, px: 1 },
        }}
      >
        {/* In this order in the DOM, and so right to left on the screen: the
            history sits to the LEFT of the discussion, where it was asked. */}
        <ToggleButton value={DISCUSSION_MODES.search}>חיפוש חכם</ToggleButton>
        <ToggleButton value={DISCUSSION_MODES.chat}>דיון עם בינה מלאכותית</ToggleButton>
        <ToggleButton value={DISCUSSION_MODES.history}>היסטוריה</ToggleButton>
      </ToggleButtonGroup>

      {readiness !== "ready" ? (
        <Alert severity={NOT_READY[readiness].severity} data-testid="discussion-not-ready">
          {NOT_READY[readiness].text}
        </Alert>
      ) : (
        <>
          {/* The search and the chat know only what reads — said where they
              are used, not only on the summary tab. */}
          {isText && <TextQualityNotice quality={transcript?.text_quality} />}
          <Typography variant="caption" color="text.secondary">{caption(mode, isText)}</Typography>
          {mode === DISCUSSION_MODES.search && (
            <SmartSearchPane search={search} isText={isText} onSeek={onSeek} onOpenPage={onOpenPage} />
          )}
          {mode === DISCUSSION_MODES.chat && (
            <ChatPane chat={chat} notebook={notebook} isText={isText} onSeek={onSeek} onOpenPage={onOpenPage} />
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
