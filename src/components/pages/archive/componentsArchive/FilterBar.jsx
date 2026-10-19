import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Badge from "@mui/material/Badge";
import Collapse from "@mui/material/Collapse";
import Paper from "@mui/material/Paper";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import TagDrilldown from "./TagDrilldown";
import SelectedTags from "./SelectedTags";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import TuneIcon from "@mui/icons-material/Tune";
import SearchBar from "../../../features/SearchBar/SearchBar";
import { mediaTypeLabels } from "../../../../utilities/constant";
import { decisionCount } from "./tagStates";
import { ALL_TYPES, isAllTypes, isTypePressed } from "./typeSelection";
import { SORT_OPTIONS, DEFAULT_SORT } from "./sortOptions";
import { DURATION_OPTIONS } from "./durationOptions";

// The archive's filters.
//
// ── Why they hide behind a button ───────────────────────────────────────────
//
// Every control used to sit in the header at once — a type toggle, a creator
// select and a search box — and the row grew with each one. That has two costs
// and the second is the expensive one: it crowds the page, and it makes every
// filter look equally important. In practice a visitor searches, and the rest
// is occasional. So the search stays out, and every filter — the media type
// included — opens on request.
//
// The count on the button is what makes that safe. A hidden filter that is still
// applied is how somebody concludes the archive is empty; the badge means the
// panel is never silently narrowing what they see.
//
// ── Why the panel is horizontal ─────────────────────────────────────────────
//
// It is a strip under the header, not a sidebar. A vertical rail would take a
// column of width permanently and push the grid — the thing people came for —
// off to one side, on a page whose whole job is showing cards. Laid out as a
// wrapping flex row, it is one line on a desktop and stacks by itself on a
// phone without a second layout.

// The panel's own controls, sized so four sit on one line at desktop widths and
// wrap in pairs below that.
const fieldSx = { minWidth: 190, flex: "1 1 190px" };

// The value "הכל" carries inside the toggle group. Not a media type, and never
// sent anywhere — it only lets the group draw that button pressed.
const ALL = "all";

const FilterBar = ({
  selectedTypes = [],
  onToggleType,
  onPressAllTypes,
  sortOrder = DEFAULT_SORT,
  onSortChange,
  durationRange = "",
  onDurationFilter,
  lengthOffered = true,
  onSearch,
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
  const [open, setOpen] = useState(false);

  // Everything inside the panel is counted, the type toggle included — it lives
  // in the panel now, so a shut panel can hide it like anything else. And an
  // EXCLUSION is one of them. A tag taken out narrows the archive
  // exactly as much as one put in, so a badge that counted only the choices
  // would leave "everything except שמות" reading as no filter at all, which is
  // the hidden-filter failure this badge exists to prevent.
  //
  // Counted as DECISIONS, not as tags reached. Choosing תורה is one click and
  // fifty-four tags; "54" here would read as fifty-four hidden filters rather
  // than one branch. The number of tags a choice actually reaches is said on the
  // chip itself, where it answers the question somebody is asking when they look
  // at it — see SelectedTags.
  const activeCount =
    // One decision however many types it names, like a tag branch.
    (isAllTypes(selectedTypes) ? 0 : 1) +
    (creatorFilter ? 1 : 0) +
    decisionCount({ includedIds: tagIds, excludedIds: excludedTagIds }) +
    (uploadedAfter ? 1 : 0) +
    (uploadedBefore ? 1 : 0) +
    (lengthOffered && durationRange ? 1 : 0);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      {/* The permanent row: what people reach for every time.
          Three columns, the outer two equal, so the button sits at the true
          centre of the row whatever the search box's width — centring it with
          flex would put the centre of the button AND the search there together.
          The search keeps the end of the row it always had. On a phone the two
          stack, button above search. */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "1fr auto 1fr" },
          alignItems: "center",
          justifyItems: "center",
          gap: 2,
        }}
      >
        {/* The badge is the whole reason this is safe to collapse. */}
        <Badge badgeContent={activeCount} color="primary" sx={{ gridColumn: { sm: 2 } }}>
          <Button
            variant={open || activeCount > 0 ? "contained" : "outlined"}
            size="small"
            startIcon={<TuneIcon />}
            onClick={() => setOpen((prev) => !prev)}
            aria-expanded={open}
            sx={{ borderRadius: "10px" }}
          >
            סינון
          </Button>
        </Badge>

        <Box
          sx={{
            gridColumn: { sm: 3 },
            justifySelf: { xs: "stretch", sm: "end" },
            display: "flex",
            alignItems: "center",
            gap: 1,
            flexWrap: "wrap",
          }}
        >
          {/* The order sits beside the search rather than in the panel: it never
              hides a card, so it is not one of the filters the badge counts and
              there is nothing about it a shut panel should conceal. Same tray
              look as the search, so the two read as one control strip. */}
          <TextField
            select
            size="small"
            label="מיון"
            value={sortOrder}
            onChange={(e) => onSortChange?.(e.target.value)}
            sx={(theme) => ({
              minWidth: 170,
              "& .MuiOutlinedInput-root": {
                borderRadius: "10px",
                bgcolor: theme.palette.mode === "dark" ? "rgba(255,255,255,0.06)" : "#eef1f3",
              },
              "& fieldset": { border: "none" },
            })}
          >
            {SORT_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
            ))}
          </TextField>
          <SearchBar
            onSearch={onSearch}
            placeholder="חיפוש..."
            sx={(theme) => ({
              "& .MuiOutlinedInput-root": {
                borderRadius: "10px",
                bgcolor: theme.palette.mode === "dark" ? "rgba(255,255,255,0.06)" : "#eef1f3",
              },
              "& fieldset": { border: "none" },
            })}
          />
        </Box>
      </Box>

      {/* The strip. Collapse rather than a conditional render so it slides open
          instead of the grid jumping — and so the controls keep their state
          while it is shut. */}
      <Collapse in={open} unmountOnExit={false}>
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            borderRadius: "12px",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "flex-start",
            gap: 2,
          }}
        >
          {/* The media type first, on a line of its own: it is the coarsest cut
              and the one most often made, so it opens at the top of the strip,
              centred.
              Its label sits ON the top edge of the outline, in the middle, the
              way the date and creator fields beside it carry theirs — the label
              is given the panel's own background so it cuts a notch in the line.
              The group is labelled by it, so a screen reader announces what the
              four buttons choose. */}
          <Box sx={{ width: "100%", display: "flex", justifyContent: "center", pt: 0.75 }}>
            <Box sx={{ position: "relative" }}>
              <Typography
                id="archive-type-filter-label"
                sx={{
                  position: "absolute",
                  top: 0,
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  zIndex: 1,
                  px: 0.75,
                  bgcolor: "background.paper",
                  color: "text.secondary",
                  fontSize: "0.75rem",
                  lineHeight: 1,
                  whiteSpace: "nowrap",
                }}
              >
                סוג תוכן
              </Typography>
              <ToggleButtonGroup
                aria-labelledby="archive-type-filter-label"
                // A multi-select, and each button says what a press of it means
                // — the group's own onChange would hand back an array and leave
                // us to work out which button changed it. Under "הכל" only "הכל"
                // is pressed — see typeSelection.js for why the types are not.
                value={[
                  ...(isAllTypes(selectedTypes) ? [ALL] : []),
                  ...ALL_TYPES.filter((t) => isTypePressed(selectedTypes, t)),
                ]}
                size="small"
                sx={(theme) => {
                  const dark = theme.palette.mode === "dark";
                  return {
                    // Much fainter than it was: a hint of a tray, not a block of grey.
                    bgcolor: dark ? "rgba(255,255,255,0.03)" : "#f5f7f9",
                    // The same outline as the outlined fields in this panel.
                    border: `1px solid ${dark ? "rgba(255,255,255,0.23)" : "rgba(0,0,0,0.23)"}`,
                    borderRadius: "12px",
                    p: 0.5,
                    pt: 0.9,   // room under the label on the top edge
                    gap: 0.5,
                    "& .MuiToggleButton-root": {
                      borderRadius: "9px !important",
                      px: 2.25,
                      py: 0.6,
                      fontWeight: 700,
                      fontSize: "0.75rem",
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                      border: "none !important",
                      color: "text.secondary",
                      "&.Mui-selected": {
                        bgcolor: dark ? "rgba(255,255,255,0.16)" : "#ffffff",
                        color: "primary.main",
                        boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
                        "&:hover": { bgcolor: dark ? "rgba(255,255,255,0.16)" : "#ffffff" },
                      },
                      // Darkening, because lightening barely shows on a tray this pale.
                      "&:hover": { bgcolor: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)" },
                    },
                  };
                }}
              >
                <ToggleButton value={ALL} onClick={onPressAllTypes}>הכל</ToggleButton>
                {ALL_TYPES.map((t) => (
                  <ToggleButton key={t} value={t} onClick={() => onToggleType(t)}>
                    {mediaTypeLabels[t]}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Box>
          </Box>

          {/* Hidden when there is nothing to choose between — one creator makes
              this a control with a single option, which is noise. */}
          {knownCreators.length > 1 && (
            <TextField
              select
              size="small"
              value={creatorFilter}
              onChange={(e) => onCreatorFilter(e.target.value)}
              label="מרצה / מחבר"
              sx={fieldSx}
            >
              <MenuItem value="">הכל</MenuItem>
              {knownCreators.map((name) => (
                <MenuItem key={name} value={name}>{name}</MenuItem>
              ))}
            </TextField>
          )}

          {/* How long a recording runs. Not offered with only "קריאה" chosen —
              a book has no length — and choosing one leaves books out, which
              the server decides; see componentsArchive/durationOptions.js. */}
          {lengthOffered && (
            <TextField
              select
              size="small"
              value={durationRange}
              onChange={(e) => onDurationFilter?.(e.target.value)}
              label="אורך השיעור"
              sx={fieldSx}
            >
              <MenuItem value="">הכל</MenuItem>
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
            label="הועלה מ־"
            value={uploadedAfter}
            onChange={(e) => onDateFilter("uploadedAfter", e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={fieldSx}
          />
          <TextField
            type="date"
            size="small"
            label="הועלה עד"
            value={uploadedBefore}
            onChange={(e) => onDateFilter("uploadedBefore", e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={fieldSx}
          />

          {/* Appears only once there is something to clear, so the strip does
              not open with a disabled control in it. */}
          {activeCount > 0 && (
            <Button size="small" onClick={onClearAll} sx={{ alignSelf: "center" }}>
              ניקוי הכל
            </Button>
          )}

          {/* Tags get the full width of the strip and a rule above them, because
              they are a place you navigate rather than a value you pick — and
              sharing a row with three selects would give them one column to do
              it in. Several chosen tags under ONE heading are alternatives, and
              two headings are conditions — the same rule the server applies. */}
          {tagTree.length > 0 && (
            <>
              <Divider flexItem sx={{ width: "100%", my: 0.5 }} />
              {/* What is chosen, ABOVE the navigation that chose it. The
                  drill-down shows one level; this shows the answer. */}
              <SelectedTags
                nodes={tagTree}
                selectedIds={tagIds}
                excludedIds={excludedTagIds}
                // Removing a chip forgets the tag, whichever list it is in — it
                // is deliberately NOT the toggle the drill-down uses, which on an
                // excluded tag would move it into the chosen list and turn "not
                // this branch" into "only this branch".
                onRemove={onRemoveTag}
                onClear={onClearTags}
              />
              <TagDrilldown
                nodes={tagTree}
                selectedIds={tagIds}
                excludedIds={excludedTagIds}
                onCycle={onCycleTag}
              />
            </>
          )}
        </Paper>
      </Collapse>
    </Box>
  );
};

export default FilterBar;
