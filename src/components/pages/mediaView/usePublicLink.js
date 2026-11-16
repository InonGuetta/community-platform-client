import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { updateMedia } from "../../../store/slicesAndThunks/mediaSlice/mediaPut";
import { notify } from "../../../store/slicesAndThunks/snackbarSlice";
import { selectUser } from "../../../store/selectors/authSelectors";
import { canManageMedia } from "../../../utilities/permissions";
import { publicApi } from "../../../api/publicApi";
import { useTranslation } from "react-i18next";

// Opening one lesson to anyone with the link (PRD COM-3b; decided 2026-11-05:
// the archive stays closed, and a lesson's manager may make that lesson public).
//
// For the share dialog: whether this lesson is public, the link to share when
// it is, and — for whoever manages it — the switch. A guest sees it only while
// it is also published, so the switch says so rather than pretending.
const usePublicLink = (media) => {
  const { t } = useTranslation("lesson");
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const [busy, setBusy] = useState(false);

  const isPublic = Boolean(media?.is_public);
  const toggle = async () => {
    setBusy(true);
    const next = !isPublic;
    const result = await dispatch(updateMedia({ id: media.id, isPublic: next }));
    setBusy(false);
    dispatch(notify(
      result.meta.requestStatus === "fulfilled"
        ? { message: next ? t("share.nowPublic") : t("share.noLongerPublic"), severity: "success" }
        : { message: t("share.publicFailed"), severity: "error" }
    ));
  };

  return {
    isPublic,
    isPublished: media?.is_published !== false,
    canManage: canManageMedia(user, media),
    busy,
    toggle,
    url: media?.id ? publicApi.shareUrl(media.id) : "",
  };
};

export default usePublicLink;
