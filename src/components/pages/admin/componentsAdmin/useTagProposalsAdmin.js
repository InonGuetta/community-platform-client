import { useCallback, useEffect, useState } from "react";
import { adminApi } from "../../../../api/adminApi";
import { mediaApi } from "../../../../api/mediaApi";
import { hebrewForError, rejectionOf } from "../../../../utilities/apiError";

// The admin's queue of new tags, and the two decisions on it.
//
// The tree is fetched beside the queue because a proposal names its parent by
// id: the path shown ("מעגל השנה ← מעגל השנה לפי שבתות") is drawn from the tree,
// the same way the lecturer saw it when choosing.
export const useTagProposalsAdmin = () => {
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
      setError(hebrewForError(rejectionOf(err), "לא ניתן לטעון את התגיות שממתינות לאישור"));
    }
  }, []);

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
        `התגית «${result.name}» אושרה ונכנסה למערכת` +
          (result.tagged_count > 0 ? ` ונוספה ל-${result.tagged_count} שיעורים.` : ".")
      );
      return result;
    }, "האישור נכשל. נסה שוב.");

  const reject = (proposal, reason) =>
    decide(async () => {
      await adminApi.rejectTagProposal(proposal.id, reason);
      setNotice(`ההצעה «${proposal.name}» נדחתה.`);
    }, "הדחייה נכשלה. נסה שוב.");

  return { proposals, tree, error, notice, clearNotice: () => setNotice(null), approve, reject };
};
