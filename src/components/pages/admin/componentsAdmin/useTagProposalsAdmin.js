import { useCallback, useEffect, useState } from "react";
import { adminApi } from "../../../../api/adminApi";
import { mediaApi } from "../../../../api/mediaApi";
import { hebrewForError, rejectionOf } from "../../../../utilities/apiError";
import { useTranslation } from "react-i18next";

// The admin's queue of new tags, and the two decisions on it.
//
// The tree is fetched beside the queue because a proposal names its parent by
// id: the path shown ("מעגל השנה ← מעגל השנה לפי שבתות") is drawn from the tree,
// the same way the lecturer saw it when choosing.
export const useTagProposalsAdmin = () => {
  const { t } = useTranslation("admin");
  const [proposals, setProposals] = useState(null);
  const [tree, setTree] = useState([]);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const load = useCallback(async () => {
    try {
      const [queue, nodes] = await Promise.all([adminApi.tagProposals(), mediaApi.tags()]);
      setProposals(queue);
      setTree(nodes);
      setError(null);
    } catch (err) {
      setError(hebrewForError(rejectionOf(err), t("tags.loadFailed")));
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  // A decision someone else already made (TAG_PROPOSAL_DECIDED) is not a
  // failure to retry — the queue is stale, so it is reloaded either way.
  const decide = async (work, fallback) => {
    try {
      const result = await work();
      await load();
      return result;
    } catch (err) {
      await load();
      throw { hebrew: hebrewForError(rejectionOf(err), fallback) };
    }
  };

  const approve = (proposal, changes) =>
    decide(async () => {
      const result = await adminApi.approveTagProposal(proposal.id, changes);
      setNotice(
        result.tagged_count > 0
          ? t("tags.approvedTagged", { name: result.name, count: result.tagged_count })
          : t("tags.approved", { name: result.name })
      );
      return result;
    }, t("tags.approveFailed"));

  const reject = (proposal, reason) =>
    decide(async () => {
      await adminApi.rejectTagProposal(proposal.id, reason);
      setNotice(t("tags.rejected", { name: proposal.name }));
    }, t("tags.rejectFailed"));

  return { proposals, tree, error, notice, clearNotice: () => setNotice(null), approve, reject };
};
