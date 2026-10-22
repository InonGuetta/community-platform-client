import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import useAIDiscussionController, { DISCUSSION_MODES } from "../../useAIDiscussionController";
import SmartSearchPane from "./SmartSearchPane";
import ChatPane from "./ChatPane";

// The "דיון עם AI" tab: a switch between two ways of asking about THIS lesson.
//
//   חיפוש חכם      passages from the lesson, nothing generated — cheap, fast,
//                  and cannot put words in the lecturer's mouth
//   שיחה עם AI     a conversation, answered only from the lesson's own text,
//                  every claim citing the passage it rests on
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

const AIDiscussionPanel = ({ mediaId, transcript, isText = false, onSeek, onOpenPage }) => {
  const { mode, setMode, readiness, search, chat } = useAIDiscussionController({ mediaId, transcript });

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
        }}
      >
        <ToggleButton value={DISCUSSION_MODES.search}>חיפוש חכם</ToggleButton>
        <ToggleButton value={DISCUSSION_MODES.chat}>שיחה עם AI</ToggleButton>
      </ToggleButtonGroup>

      {readiness !== "ready" ? (
        <Alert severity={NOT_READY[readiness].severity} data-testid="discussion-not-ready">
          {NOT_READY[readiness].text}
        </Alert>
      ) : (
        <>
          <Typography variant="caption" color="text.secondary">
            {mode === DISCUSSION_MODES.search
              ? `חיפוש לפי משמעות בתוך ${isText ? "הספר" : "השיעור"} הזה בלבד`
              : `התשובות מבוססות על ${isText ? "הספר" : "השיעור"} הזה בלבד, עם הפניה למקור`}
          </Typography>
          {mode === DISCUSSION_MODES.search ? (
            <SmartSearchPane search={search} isText={isText} onSeek={onSeek} onOpenPage={onOpenPage} />
          ) : (
            <ChatPane chat={chat} isText={isText} onSeek={onSeek} onOpenPage={onOpenPage} />
          )}
        </>
      )}
    </Box>
  );
};

export default AIDiscussionPanel;
