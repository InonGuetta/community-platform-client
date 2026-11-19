import { useTranslation } from "react-i18next";
import EmptyState from "../EmptyState/EmptyState";

// The empty state of the callers that predate EmptyState (D-30): the message
// becomes its title. `actionLabel` + `onAction` are optional: when both are
// provided the empty state offers a call-to-action button (e.g. "upload
// media"); a caller that passes only `message` gets no button. Without a
// `message`, the shared "nothing to show".
const NoDataDialog = ({ message, actionLabel, onAction }) => {
  const { t } = useTranslation();
  return (
    <EmptyState
      title={message ?? t("noData")}
      action={actionLabel && onAction ? { label: actionLabel, onClick: onAction } : null}
    />
  );
};

export default NoDataDialog;
