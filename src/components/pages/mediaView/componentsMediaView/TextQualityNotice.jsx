import Alert from "@mui/material/Alert";
import { LOW_TEXT_QUALITY } from "../../../../utilities/constant";
import { useTranslation } from "react-i18next";

// Said on a book whose extracted text is largely unreadable — a PDF whose text
// layer is broken OCR, typically a multi-column page read across its columns.
// The server measures the readable share once, at extraction (migration 033);
// `quality` is that percentage, or null when it was never measured.
//
// The reader is told the consequence, which is what they can act on: the
// summary, the search and the chat know only the part that reads. Whoever can
// re-upload the book is also told how to fix it. A warning, not a block — a
// book that is a quarter readable is still a quarter useful.
const TextQualityNotice = ({ quality, canFix = false, sx }) => {
  const { t } = useTranslation("lesson");
  if (quality == null || quality >= LOW_TEXT_QUALITY) return null;
  return (
    <Alert severity="warning" data-testid="text-quality-notice" sx={sx}>
      {t("textQuality.readable", { quality })}
      {canFix && t("textQuality.howToFix")}
    </Alert>
  );
};

export default TextQualityNotice;
