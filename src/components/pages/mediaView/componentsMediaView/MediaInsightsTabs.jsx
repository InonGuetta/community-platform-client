import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import AISummaryPanel from "./AISummaryPanel";
import ChaptersPanel from "./ChaptersPanel";
import TranscriptEditor from "../../../features/TranscriptEditor/TranscriptEditor";

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
const MediaInsightsTabs = ({ mediaId, insights, notesPanel = null, onSeek }) => {
  const {
    transcript, isText, keyPointHeadings,
    canEditTranscript, canGenerateHeadings,
    generatingHeadings, generateHeadings,
    generatingSummary, generateSummary,
    pollingStalled, retryPolling,
  } = insights;

  const [tab, setTab] = useState(0);

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
    { key: "summary", label: "סיכום" },
    ...(isText ? [] : [{ key: "chapters", label: "פרקים" }]),
    ...(notesPanel ? [{ key: "notes", label: "הערות אישיות" }] : []),
    ...(isText ? [] : [{ key: "transcript", label: "תמלול" }]),
  ];
  const activeTab = Math.min(tab, tabs.length - 1);
  const activeKey = tabs[activeTab]?.key;

  return (
    <>
      <Tabs value={activeTab} onChange={(_, v) => setTab(v)} variant="fullWidth" sx={{ mb: 2, flexShrink: 0 }}>
        {tabs.map((t) => <Tab key={t.key} label={t.label} />)}
      </Tabs>

      <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
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
          />
        )}
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
        {activeKey === "transcript" && (
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
