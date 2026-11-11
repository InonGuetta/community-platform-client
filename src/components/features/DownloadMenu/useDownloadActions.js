import { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { transcriptsApi } from "../../../api/transcriptsApi";
import { transcriptToText } from "../../../utilities/transcriptText";
import { mediaTypes } from "../../../utilities/constant";
import { notify } from "../../../store/slicesAndThunks/notificationSlice";
import { saveForOffline } from "../../../store/slicesAndThunks/offlineSlice/offlineGet";
import { selectIsOffline, selectOfflineProgressFor } from "../../../store/selectors/offlineSelectors";
import { transcriptCues } from "../../../utilities/transcriptTiming";

// What the download entries DO for one lecture — building the transcript PDF,
// keeping the lesson for listening offline, and the state each entry shows —
// so that downloadOptions.jsx only builds the menu items. See there for which
// entries a lecture gets.
/**
 * @param {{ media: any, transcript?: any, hasTranscript?: boolean, onClose?: () => void }} props
 */
export const useDownloadActions = ({ media, transcript, hasTranscript, onClose }) => {
  const dispatch = useDispatch();
  const [busy, setBusy] = useState(false);
  const savedOffline = useSelector(selectIsOffline(media.id));
  const saving = useSelector(selectOfflineProgressFor(media.id));

  const loadedText = transcriptToText(transcript);
  const captions = useMemo(
    () => (media.media_type === mediaTypes.text ? null : transcriptCues(transcript)),
    [media.media_type, transcript]
  );
  const offerTranscript = Boolean(loadedText) || Boolean(hasTranscript);

  // Building the PDF pulls in jsPDF, the bidi tables and the Hebrew font, and may
  // need the transcript itself first, so it is async and can fail. A failure is
  // reported rather than swallowed: from the user's side a silent no-op is
  // indistinguishable from a click that missed.
  const handleTranscript = async () => {
    setBusy(true);
    try {
      const text = loadedText || transcriptToText(await transcriptsApi.get(media.id));
      if (!text) {
        dispatch(notify({ message: "אין תמלול זמין לפריט זה.", severity: "warning" }));
        return;
      }
      // Both come from the same dynamic import: the filename rule belongs with
      // the writer that uses it, and pulling it in statically would drag the
      // PDF module into the bundle everyone loads.
      const { downloadHebrewPdf, safeFileBaseName } = await import("../../../utilities/hebrewPdf");
      // One section, no heading: the transcript IS the document, and a heading
      // repeating the title directly under it would only be the title twice.
      await downloadHebrewPdf({
        title: media.title,
        sections: [{ text }],
        filename: `${safeFileBaseName(media.title, "תמלול")}.pdf`,
      });
    } catch {
      dispatch(notify({ message: "יצירת ה-PDF נכשלה. נסה שוב.", severity: "error" }));
    } finally {
      setBusy(false);
      onClose?.();
    }
  };

  const saveOffline = () => dispatch(saveForOffline(media));

  return { busy, savedOffline, saving, captions, offerTranscript, handleTranscript, saveOffline };
};
