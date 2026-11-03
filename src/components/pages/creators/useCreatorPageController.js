import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import useArchivePageController from "../archive/useArchivePageController";
import { selectUser } from "../../../store/selectors/authSelectors";
import { mediaApi } from "../../../api/mediaApi";
import { isPrivileged } from "../../../utilities/permissions";

// A lecturer's page (PRD ATTR-10, ARCH-5): the header — their totals and
// courses — and below it the archive with them already chosen.
//
// The header is fetched here and not kept in the store: nothing else reads it,
// and it is a summary of a page, not a resource the app edits.
export const useCreatorPageController = () => {
  const { name = "" } = useParams();
  const navigate = useNavigate();
  const user = useSelector(selectUser);
  const archive = useArchivePageController({ fixedCreator: name });
  const [profile, setProfile] = useState({ status: "loading", data: null });

  useEffect(() => {
    let current = true;
    setProfile({ status: "loading", data: null });
    mediaApi
      .creatorProfile(name)
      .then((data) => { if (current) setProfile({ status: "succeeded", data }); })
      // A 404 is the common failure — a name with nothing visible under it — and
      // the page says so in its own words; any other failure says the same, as
      // the grid below still answers for itself.
      .catch(() => { if (current) setProfile({ status: "failed", data: null }); });
    return () => { current = false; };
  }, [name]);

  return {
    name,
    profile: profile.data,
    profileStatus: profile.status,
    archive,
    user,
    canUpload: isPrivileged(user),
    goToArchive: () => navigate("/archive"),
  };
};
