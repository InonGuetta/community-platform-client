import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import SegmentedControl from "../../../features/SegmentedControl/SegmentedControl";
import AISummaryPanel from "./AISummaryPanel";
import ChaptersPanel from "./ChaptersPanel";
import TranscriptEditor from "../../../features/TranscriptEditor/TranscriptEditor";
import FollowAlongTranscript from "./FollowAlongTranscript";
import { useTranslation } from "react-i18next";

// The summary / chapters / transcript block, shared by the media page and the
// notebook's source preview so the two cannot drift apart.
//
// `insights` is the object useMediaInsights returns, passed through whole: every
// field in it feeds one of these panels, and spreading it into a dozen props
// only means editing three files the next time a panel needs one more.
//
// The personal-notes tab arrives as a `notesPanel` NODE rather than as props.
// Writing a bookmark needs a player to read the time off, which the media page
// has and a caller might not — as a slot, this component stays out of it and
// simply omits the tab when nobody passes one.
// `tags` are the lesson's own tags, shown at the foot of the summary tab.
//
// "דיון עם AI" arrives as a slot for the same reason as the notes: it owns its
// own dispatches and needs the page's player and reader to open a citation,
// which the notebook's source preview does not offer. No slot, no tab.
//
// `captions` and `currentTime` let the transcript tab follow the lesson as it
// plays (PRD MOB-6). Without them — the notebook's preview — the tab shows the
// full text only, as before.
const MediaInsightsTabs = ({
  mediaId, insights, notesPanel = null, discussionPanel = null, onSeek, tags = [],
  captions = null, currentTime = 0,
  // Tags the LLM proposed (PRD ARCH-4), at the foot of the summary — a slot,
  // like the notes, because only the page knows whether the reader may tag.
  tagSuggestionsPanel = null,
  // A lesson recorded in a live session: that session's chat (PRD REC-3).
  // No slot, no tab — every other lesson.
  sessionChatPanel = null,
}) => {
  const { t } = useTranslation("lesson");
  const {
    transcript, isText, keyPointHeadings,
    canEditTranscript, canGenerateHeadings,
    generatingHeadings, generateHeadings,
    generatingSummary, generateSummary,
    pollingStalled, retryPolling,
  } = insights;

  const [tab, setTab] = useState(0);
  // "follow" — the sentence being said, highlighted; "text" — the whole
  // transcript, where the lecturer edits it and starts the AI actions.
  const [transcriptView, setTranscriptView] = useState("follow");

  // Different media types offer different tabs, so an index kept across a
  // navigation could land on a tab that no longer exists there.
  useEffect(() => { setTab(0); }, [mediaId]);

  // Built as a list rather than fixed indices: a document hides two of the four
  // tabs, and hard-coded `tab === 2` checks silently point at the wrong panel
  // the moment the set changes.
  //
  // "פרקים" and "תמלול" are both absent for a document. Chapters place a heading
  // on a *timeline* and seek the player to it — a book has neither — and there is
  // no transcript to edit. Personal notes stay, unchanged.
  const tabs = [
    { key: "summary", label: t("tabs.summary") },
    ...(isText ? [] : [{ key: "chapters", label: t("tabs.chapters") }]),
    ...(isText ? [] : [{ key: "transcript", label: t("tabs.transcript") }]),
    ...(notesPanel ? [{ key: "notes", label: t("tabs.notes") }] : []),
    ...(sessionChatPanel ? [{ key: "sessionChat", label: t("tabs.sessionChat") }] : []),
    // Last in the list, which in this right-to-left row is to the LEFT of
    // "הערות אישיות". Offered for books too: a book's text is in the same
    // chunks a recording's transcript is.
    ...(discussionPanel ? [{ key: "discuss", label: t("tabs.discuss") }] : []),
  ];
  const activeTab = Math.min(tab, tabs.length - 1);
  const activeKey = tabs[activeTab]?.key;

  return (
    <>
      {/* Redesign v4 (component 10): the theme draws the row — a hairline
          under it, 15px bold labels, a 2px accent indicator — and scrolls it
          sideways when the five do not fit, rather than squeezing them into
          equal slivers as the old full-width row did. */}
      <Tabs value={activeTab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, flexShrink: 0 }}>
        {tabs.map((t) => <Tab key={t.key} label={t.label} />)}
      </Tabs>

      {/* UI_UX_FIXES 2.1 (overrides D-22): the card no longer scrolls inside
          itself — the page scrolls, like any other. The one exception is the
          follow-along transcript, which may scroll in a box of its own (and
          never inside another scrolling box), so the playing line can be kept
          in view. */}
      <Box>
        {activeKey === "summary" && (
          <AISummaryPanel
            transcript={transcript}
            isText={isText}
            // Documents only: for audio/video this trigger would restart
            // Whisper, and re-buying a three-hour transcription is not
            // what "generate summary" should mean. Audio keeps its
            // existing button in the transcript tab.
            canGenerate={canEditTranscript && isText}
            generating={generatingSummary}
            onGenerate={generateSummary}
            pollingStalled={pollingStalled}
            onRetryPolling={retryPolling}
            tags={tags}
          />
        )}
        {activeKey === "summary" && tagSuggestionsPanel}
        {activeKey === "chapters" && (
          <ChaptersPanel
            keyPointHeadings={keyPointHeadings}
            onSeek={onSeek}
            canEdit={canEditTranscript}
            canGenerate={canGenerateHeadings}
            generating={generatingHeadings}
            onGenerate={generateHeadings}
          />
        )}
        {activeKey === "notes" && notesPanel}
        {activeKey === "sessionChat" && sessionChatPanel}
        {activeKey === "discuss" && discussionPanel}
        {activeKey === "transcript" && captions && (
          <SegmentedControl
            value={transcriptView}
            onChange={setTranscriptView}
            label={t("tabs.transcriptView")}
            options={[
              { value: "follow", label: t("tabs.follow") },
              { value: "text", label: canEditTranscript ? t("tabs.fullTextEdit") : t("tabs.fullText") },
            ]}
            sx={{ mb: 2.5 }}
          />
        )}
        {activeKey === "transcript" && captions && transcriptView === "follow" && (
          <Box sx={{ maxHeight: { md: "60vh" }, overflowY: { md: "auto" } }}>
            <FollowAlongTranscript captions={captions} currentTime={currentTime} onSeek={onSeek} />
          </Box>
        )}
        {activeKey === "transcript" && (!captions || transcriptView === "text") && (
          <TranscriptEditor
            transcript={transcript}
            mediaId={mediaId}
            canEdit={canEditTranscript}
            pollingStalled={pollingStalled}
            onRetryPolling={retryPolling}
          />
        )}
      </Box>
    </>
  );
};

export default MediaInsightsTabs;
