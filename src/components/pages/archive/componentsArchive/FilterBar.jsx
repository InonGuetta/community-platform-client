import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Collapse from "@mui/material/Collapse";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Divider from "@mui/material/Divider";
import TagDrilldown from "./TagDrilldown";
import SelectedTags from "./SelectedTags";
import SectionCard from "../../../features/SectionCard/SectionCard";
import { DURATION_OPTIONS } from "../../../../utilities/durationOptions";
import { creatorDisplayName } from "../../../../utilities/creatorPage";
import { activeFilterCount } from "./filterCount";
import { HEADER_HEIGHT } from "../../../layout/shellGeometry";
import { useTranslation } from "react-i18next";

// The archive's filter panel (mockup 29): a card under the toolbar, opened by
// its "סינון" chip (ArchiveToolbar), which also shows how many filters it holds.
// The lecturer, the length and the two dates in a row, then the tags.
//
// No type selector, although mockup 29 draws one: the type is the toolbar's
// chips, and only there (decision 1). Not the order either — it never hides a
// card.
//
// Collapse rather than a conditional render, so it slides open instead of the
// grid jumping, and so the controls keep their state while it is shut.

// Four to a row on a desktop, two on a tablet, one on a phone.
const fieldsSx = {
  display: "grid",
  gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "repeat(2, minmax(0, 1fr))", md: "repeat(4, minmax(0, 1fr))" },
  gap: 2,
  alignItems: "end",
};

// Today as a date input writes it: local, YYYY-MM-DD (not toISOString, which is UTC).
const todayInput = () => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

const FilterBar = ({
  open = false,
  durationRange = "",
  onDurationFilter,
  lengthOffered = true,
  creatorFilter = "",
  knownCreators = [],
  onCreatorFilter,
  tagIds = [],
  excludedTagIds = [],
  tagTree = [],
  onCycleTag,
  onRemoveTag,
  onClearTags,
  uploadedAfter = "",
  uploadedBefore = "",
  onDateFilter,
  onClearAll,
}) => {
  "use no memo"; // reads i18next outside useTranslation's t while rendering: compiled, it would keep the old language
  const { t } = useTranslation("archive");
  const activeCount = activeFilterCount({
    creatorFilter, tagIds, excludedTagIds, uploadedAfter, uploadedBefore, lengthOffered, durationRange,
  });

  // The range cannot be turned inside out (UI_UX_FIXES 1.3): "from" ends at
  // "to" (or today), "to" starts at "from" and ends today.
  const today = todayInput();

  return (
    <Collapse in={open} unmountOnExit={false}>
      {/* The panel sits in the sticky band, so it scrolls inside the room the
          screen leaves under the header and the toolbar. */}
      <Box sx={{ maxHeight: { xs: `calc(100vh - ${HEADER_HEIGHT + 190}px)`, md: `calc(100vh - ${HEADER_HEIGHT + 140}px)` }, overflowY: "auto" }}>
      <SectionCard component="div" sx={{ mt: { xs: 2, md: 3 } }}>
        <Box id="archive-filter-panel" sx={fieldsSx}>
          {/* Hidden when there is nothing to choose between — one creator makes
              this a control with a single option, which is noise. */}
          {knownCreators.length > 1 && (
            <TextField
              select
              size="small"
              value={creatorFilter}
              onChange={(e) => onCreatorFilter(e.target.value)}
              label={t("filter.creator")}
            >
              <MenuItem value="">{t("filter.all")}</MenuItem>
              {knownCreators.map((name) => (
                <MenuItem key={name} value={name}>{creatorDisplayName(name)}</MenuItem>
              ))}
            </TextField>
          )}

          {/* How long a recording runs. Not offered with only "קריאה" chosen —
              a book has no length — and choosing one leaves books out, which
              the server decides; see utilities/durationOptions.js. */}
          {lengthOffered && (
            <TextField
              select
              size="small"
              value={durationRange}
              onChange={(e) => onDurationFilter?.(e.target.value)}
              label={t("filter.length")}
            >
              <MenuItem value="">{t("filter.all")}</MenuItem>
              {DURATION_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
              ))}
            </TextField>
          )}

          {/* Native date inputs rather than a picker component: they are one
              element, they are localised by the browser, and they are keyboard
              and screen-reader accessible without any work. shrink is forced
              because a date input always renders its own placeholder, which
              would otherwise sit under a floating label. */}
          <TextField
            type="date"
            size="small"
            label={t("filter.from")}
            value={uploadedAfter}
            inputProps={{ max: uploadedBefore || today }}
            onChange={(e) => onDateFilter("uploadedAfter", e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            type="date"
            size="small"
            label={t("filter.to")}
            value={uploadedBefore}
            inputProps={{ min: uploadedAfter || undefined, max: today }}
            onChange={(e) => onDateFilter("uploadedBefore", e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />

        </Box>

        {/* Appears only once there is something to clear, so the panel does
            not open with a disabled control in it. */}
        {activeCount > 0 && (
          <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
            <Button size="small" variant="soft" onClick={onClearAll}>
              {t("filter.clearAll")}
            </Button>
          </Box>
        )}

        {/* Tags under a rule, the full width of the card, because they are a
            place you navigate rather than a value you pick. Several chosen
            tags under ONE heading are alternatives, and two headings are
            conditions — the same rule the server applies. */}
        {tagTree.length > 0 && (
          <>
            <Divider sx={{ my: { xs: 2.5, md: 3 } }} />
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              {/* What is chosen, ABOVE the navigation that chose it. The
                  drill-down shows one level; this shows the answer. */}
              <SelectedTags
                nodes={tagTree}
                selectedIds={tagIds}
                excludedIds={excludedTagIds}
                // Removing a chip forgets the tag, whichever list it is in — it
                // is deliberately NOT the toggle the drill-down uses, which on
                // an excluded tag would move it into the chosen list and turn
                // "not this branch" into "only this branch".
                onRemove={onRemoveTag}
                onClear={onClearTags}
              />
              <TagDrilldown
                nodes={tagTree}
                selectedIds={tagIds}
                excludedIds={excludedTagIds}
                onCycle={onCycleTag}
              />
            </Box>
          </>
        )}
      </SectionCard>
      </Box>
    </Collapse>
  );
};

export default FilterBar;
