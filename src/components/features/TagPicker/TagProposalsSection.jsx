import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import HourglassTopIcon from "@mui/icons-material/HourglassTop";
import ProposeTagDialog from "./ProposeTagDialog";
import { pathOf } from "./tagOptions";
import { useTagProposals } from "./useTagProposals";
import { buildTagRelations } from "../../pages/archive/componentsArchive/tagStates";
import { selectUserRole } from "../../../store/selectors/authSelectors";
import { roles } from "../../../utilities/constant";

// "הוסף תגית", and the tags this item is waiting for.
//
// Sits under the picker in both tagging dialogs — after an upload and on an
// existing item — so a tag that is missing can be asked for from the one place
// somebody discovers it is missing.
//
// ── Two outcomes, by role ───────────────────────────────────────────────────
//
// A lecturer's tag waits for an admin; it is listed here as waiting, and the
// server attaches it to this item on approval — nothing else to do. An admin's
// is created on the spot and already attached on the server, so it is handed to
// `onTagCreated`: the dialog must add it to its selection, or the save that
// follows (which REPLACES the item's tags) would take it straight back off.
const TagProposalsSection = ({ itemId, nodes, active = true, onTagCreated }) => {
  const isAdmin = useSelector(selectUserRole) === roles.admin;
  const { pending, propose, withdraw } = useTagProposals(itemId, active);
  const [open, setOpen] = useState(false);
  const relations = useMemo(() => buildTagRelations(nodes), [nodes]);

  const handleSubmit = async ({ name, parentId }) => {
    const result = await propose({ name, parentId });
    if (result.status === "approved") {
      onTagCreated?.({ id: result.tag_id, name: result.name, parent_id: result.parent_id, is_seeded: true, media_count: 1 });
    }
    setOpen(false);
  };

  return (
    <Box sx={{ mt: 1.5 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
        <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
          הוסף תגית
        </Button>
        <Typography variant="caption" color="text.secondary">
          {isAdmin ? "לא מצאת תגית מתאימה? אפשר ליצור חדשה." : "לא מצאת תגית מתאימה? אפשר להציע חדשה לאישור המנהל."}
        </Typography>
      </Box>

      {pending.length > 0 && (
        <Box sx={{ mt: 1.5 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, display: "block", mb: 0.75 }}>
            ממתינות לאישור מנהל — יתווספו לשיעור אחרי האישור:
          </Typography>
          <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
            {pending.map((proposal) => {
              const place = pathOf(relations, proposal.parent_id).join(" ← ") || "כותרת ראשית";
              return (
                <Tooltip key={proposal.id} title={`תחת: ${place}`}>
                  <Chip
                    size="small"
                    variant="outlined"
                    color="warning"
                    icon={<HourglassTopIcon />}
                    label={proposal.name}
                    onDelete={() => withdraw(proposal.id)}
                    aria-label={`ממתינה לאישור: ${proposal.name} (${place})`}
                  />
                </Tooltip>
              );
            })}
          </Box>
        </Box>
      )}

      <ProposeTagDialog
        open={open}
        nodes={nodes}
        submitLabel={isAdmin ? "יצירת התגית" : "שליחה לאישור"}
        note={
          isAdmin
            ? "כמנהל, התגית תיווצר מיד ותתווסף לשיעור הזה."
            : undefined
        }
        onClose={() => setOpen(false)}
        onSubmit={handleSubmit}
      />
    </Box>
  );
};

export default TagProposalsSection;
