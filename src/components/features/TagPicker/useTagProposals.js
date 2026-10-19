import { useCallback, useEffect, useState } from "react";
import { mediaApi } from "../../../api/mediaApi";
import { hebrewForError, rejectionOf } from "../../../utilities/apiError";
import { logger } from "../../../utilities/logger";

// The new tags an item is waiting for, and the two things that change them.
//
// Local state rather than a slice: nothing else on the page reads proposals, and
// they live only as long as the tagging dialog that shows them.
export const useTagProposals = (itemId, active) => {
  const [pending, setPending] = useState([]);

  useEffect(() => {
    if (!active || !itemId) return undefined;
    let cancelled = false;
    mediaApi
      .tagProposals(itemId)
      .then((rows) => {
        if (!cancelled) setPending(rows);
      })
      // Silent: the list is informative, and the dialog works without it.
      .catch((err) => logger.warn(`[tags] could not load proposals for ${itemId}: ${err.message}`));
    return () => {
      cancelled = true;
    };
  }, [itemId, active]);

  // Resolves with the server's answer. Rejects with `hebrew` set, which is what
  // ProposeTagDialog shows — the server's own message is English and never
  // reaches the screen (see hebrewForError).
  const propose = useCallback(
    async ({ name, parentId }) => {
      try {
        const result = await mediaApi.proposeTag(itemId, { name, parentId });
        if (result.status === "pending") {
          setPending((prev) => (prev.some((p) => p.id === result.id) ? prev : [...prev, result]));
        }
        return result;
      } catch (err) {
        throw { hebrew: hebrewForError(rejectionOf(err), "שליחת התגית נכשלה. נסה שוב.") };
      }
    },
    [itemId]
  );

  const withdraw = useCallback(
    async (proposalId) => {
      const before = pending;
      setPending((prev) => prev.filter((p) => p.id !== proposalId));
      try {
        await mediaApi.withdrawTagProposal(itemId, proposalId);
      } catch (err) {
        logger.warn(`[tags] withdraw ${proposalId} failed: ${err.message}`);
        setPending(before);
      }
    },
    [itemId, pending]
  );

  return { pending, propose, withdraw };
};
