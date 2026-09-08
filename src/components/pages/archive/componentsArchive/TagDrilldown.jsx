import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import SearchIcon from "@mui/icons-material/Search";
import Tooltip from "@mui/material/Tooltip";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import CheckIcon from "@mui/icons-material/Check";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import CircleIcon from "@mui/icons-material/Circle";
import BlockIcon from "@mui/icons-material/Block";
import IndeterminateCheckBoxIcon from "@mui/icons-material/IndeterminateCheckBox";
import {
  TAG_STATE,
  buildTagRelations,
  tagStateOf,
  isPartiallyIncluded,
  countUnder,
} from "./tagStates";

// Choosing a tag by walking down the taxonomy, one level at a time.
//
// ── Why not a list ──────────────────────────────────────────────────────────
//
// The vocabulary is 262 nodes and 224 of them are leaves. Rendered flat it is a
// wall — nobody scans 224 chips to find וירא, and the structure that makes the
// vocabulary meaningful (that וירא is a parasha, in Bereshit, in the Torah, in
// Tanach) is thrown away in the rendering. Shown a level at a time, the first
// screen is seven words.
//
// ── More states than there are decisions ────────────────────────────────────
//
// A chip is not simply chosen or unchosen, and that was the part that was wrong:
// choose "תורה", walk into it, and every book underneath looked unselected while
// the filter was in fact showing exactly that branch. The UI said "nothing
// chosen here" over an active filter, which is how somebody concludes the filter
// is broken.
//
// What a node is in is decided in tagStates.js and nowhere else — the rule is
// shared with its test, and with everything else that has to agree about what is
// being asked for. This file only decides how each state LOOKS:
//
//   included           filled chip, check
//   inherited          outlined, double-check, muted, dashed — a consequence of
//                      a choice rather than a choice
//   excluded           filled red chip, struck through: taken out by name
//   inheritedExcluded  the same in outline — out because something above it is
//   contains           a dot, so a decision three levels down can be found again
//
// A chosen branch with a hole in it gets a mark of its own on top of that: a
// half-filled box rather than a check, because a chip that goes on saying "all
// of תורה" while שמות has been taken out of it is the same lie the inherited
// state was introduced to stop telling.
//
// ── One click ───────────────────────────────────────────────────────────────
//
// A checkbox over a tree: an untouched tag is chosen, a chosen one is
// un-chosen, and one that is in the filter through a branch above it is taken
// OUT of that branch. The tooltip says which, because a chip cannot show it.
// See tagStates.js for why choosing a parasha inside a chosen book would change
// no results at all.

const TagDrilldown = ({ nodes = [], selectedIds = [], excludedIds = [], onCycle }) => {
  // The path from a root down to where the user currently is. Empty = the top.
  const [path, setPath] = useState([]);
  // Searching the vocabulary rather than walking it. Navigation alone means that
  // finding "וירא" requires already knowing it lives under תנ"ך ← תורה ← בראשית —
  // so somebody who knows the tag but not its place in the tree could not reach
  // it at all. Two characters, the same floor the student search uses, because
  // one letter matches most of 262 nodes and is not a search.
  const [query, setQuery] = useState("");

  // Both directions of the tree, walked once per tree rather than once per chip:
  // every node on the level asks who is above it and who is below it, and the
  // tree does not change between clicks.
  const relations = useMemo(() => buildTagRelations(nodes), [nodes]);
  const { byParent, ancestorsOf } = relations;

  // What the user has actually decided. Two lists, because taking a child out of
  // a chosen branch is a decision of its own and not the absence of one — see
  // tagStates.js for why that could not be a single list.
  const selection = useMemo(
    () => ({ includedIds: selectedIds, excludedIds }),
    [selectedIds, excludedIds]
  );

  const currentParent = path.length === 0 ? "root" : path[path.length - 1].id;

  // While searching, the level view is replaced by matches from the WHOLE tree,
  // each shown with its path — which is also what tells the two "שופטים" apart.
  const term = query.trim();
  const searching = term.length >= 2;
  const ancestorNodesOf = (node) =>
    ancestorsOf(node.id)
      .map((id) => relations.byId.get(id))
      .filter(Boolean);
  const pathTextOf = (node) => ancestorNodesOf(node).map((n) => n.name).join(" ← ");

  // Opening a branch. From the level view that is "one step down"; from a SEARCH
  // result it is a jump, and the two are not the same thing.
  //
  // Appending to the current path was wrong for the second case in two ways at
  // once. The breadcrumb came out as a lie — "כל התגיות ← מוסר ← בא", naming a
  // parent that is not the node's parent — and the level below it never appeared
  // at all, because the search term was still set and the view goes on showing
  // matches while it is. The arrow simply did nothing, which is the worst of the
  // two: nothing on screen said why.
  const openBranch = (node) => {
    if (searching) {
      setPath([...ancestorNodesOf(node), node]);
      // The search has done its job — it found the branch. Leaving the term in
      // place would keep the matches on screen in place of the level just opened.
      setQuery("");
      return;
    }
    setPath([...path, node]);
  };
  // A cap, because a two-letter term can match most of a few-hundred-node
  // vocabulary and a wall of chips is not a search result. What was missing is
  // the SAYING so: forty chips with nothing to indicate a forty-first left
  // somebody looking for a tag that was found and not shown.
  const MATCH_LIMIT = 40;
  const allMatches = searching
    ? nodes.filter((n) => n.name.toLowerCase().includes(term.toLowerCase()))
    : [];
  const matches = allMatches.slice(0, MATCH_LIMIT);
  const hiddenMatches = allMatches.length - matches.length;

  const level = searching ? matches : byParent.get(currentParent) || [];

  const stateOf = (node) => tagStateOf(relations, selection, node.id);

  // How each state looks. Keyed by the model's own names so that a state added
  // there cannot be answered here by accident — an unknown one draws nothing
  // rather than silently borrowing another state's picture.
  const MARK = {
    [TAG_STATE.INCLUDED]: {
      icon: <CheckIcon sx={{ fontSize: 14 }} />,
      title: "נבחר · לחיצה נוספת מבטלת את הבחירה",
    },
    [TAG_STATE.INHERITED]: {
      icon: <DoneAllIcon sx={{ fontSize: 14 }} />,
      title: "כלול דרך קטגוריית האב שנבחרה · לחיצה מוציאה אותו מהסינון",
    },
    [TAG_STATE.EXCLUDED]: {
      icon: <BlockIcon sx={{ fontSize: 14 }} />,
      title: "הוצא מהסינון · לחיצה נוספת מחזירה למצב רגיל",
    },
    [TAG_STATE.INHERITED_EXCLUDED]: {
      icon: <BlockIcon sx={{ fontSize: 14 }} />,
      title: "מחוץ לסינון דרך קטגוריית אב שהוצאה",
    },
    [TAG_STATE.CONTAINS]: {
      icon: <CircleIcon sx={{ fontSize: 8 }} />,
      title: "יש בחירה בתוך הקטגוריה הזו",
    },
    [TAG_STATE.NONE]: { icon: null, title: "" },
  };
  const markFor = (state) => MARK[state] || MARK[TAG_STATE.NONE];

  // A chosen branch that no longer holds all of itself. Shown instead of the
  // check, and counted out loud, because the whole point of the state is that
  // the number is no longer the number the user would assume.
  const PARTIAL = {
    icon: <IndeterminateCheckBoxIcon sx={{ fontSize: 14 }} />,
    title: "נבחר חלקית — יש קטגוריות שהוצאו מתוך הענף הזה",
  };

  const isOut = (state) =>
    state === TAG_STATE.EXCLUDED || state === TAG_STATE.INHERITED_EXCLUDED;

  // What each state SAYS. Until now a chip's meaning lived entirely in a colour
  // and a fourteen-pixel icon, so a screen reader announced six different states
  // as the same bare tag name — and "excluded" and "chosen" are opposite
  // instructions being read out identically.
  //
  // The next click is named too, because it is not guessable: a control with
  // three positions announced as a plain button is a control nobody can operate
  // without watching what happens.
  const SPOKEN = {
    [TAG_STATE.INCLUDED]: "נבחר · לחיצה מבטלת את הבחירה",
    [TAG_STATE.INHERITED]: "כלול דרך קטגוריית אב · לחיצה מוציאה אותו מהסינון",
    [TAG_STATE.EXCLUDED]: "הוצא מהסינון · לחיצה מחזירה",
    [TAG_STATE.INHERITED_EXCLUDED]: "מחוץ לסינון דרך קטגוריית אב · לחיצה מחזירה",
    [TAG_STATE.CONTAINS]: "יש בחירה בתוכו · לחיצה בוחרת את כולו",
    [TAG_STATE.NONE]: "לא נבחר · לחיצה בוחרת",
  };

  const spokenNameOf = (node, state, partial, chosenCount) =>
    [
      node.name,
      partial ? `נבחר חלקית, ${chosenCount} תגיות` : SPOKEN[state] || SPOKEN[TAG_STATE.NONE],
      pathTextOf(node) ? `בתוך ${pathTextOf(node)}` : "",
    ]
      .filter(Boolean)
      .join(", ");

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1, width: "100%" }}>
      {/* Where you are, and the way back. Rendered even at the top level so the
          strip does not change height as you descend. */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap", minHeight: 28 }}>
        {path.length > 0 && (
          <IconButton size="small" onClick={() => setPath(path.slice(0, -1))} aria-label="חזרה">
            <ChevronLeftIcon fontSize="small" sx={{ transform: "scaleX(-1)" }} />
          </IconButton>
        )}
        {/* A button, not clickable text. The way back up the tree was reachable
            with a mouse and with nothing else — no tab stop, no Enter, and
            nothing announced. */}
        <Box
          component="button"
          type="button"
          onClick={() => setPath([])}
          disabled={path.length === 0}
          aria-label="חזרה לכל התגיות"
          sx={{
            background: "none",
            border: "none",
            p: 0,
            font: "inherit",
            fontSize: "0.75rem",
            color: "text.secondary",
            cursor: path.length ? "pointer" : "default",
          }}
        >
          כל התגיות
        </Box>
        {path.map((node, i) => (
          <Typography key={node.id} variant="caption" sx={{ color: "text.secondary" }}>
            {" ← "}
            <Box
              component="button"
              type="button"
              onClick={() => setPath(path.slice(0, i + 1))}
              // The level being shown is where you ARE, not somewhere to go.
              aria-current={i === path.length - 1 ? "location" : undefined}
              sx={{
                background: "none",
                border: "none",
                p: 0,
                font: "inherit",
                color: "inherit",
                cursor: "pointer",
                fontWeight: i === path.length - 1 ? 700 : 400,
              }}
            >
              {node.name}
            </Box>
          </Typography>
        ))}
      </Box>

      {/* Searching the vocabulary, not the archive — this finds a TAG, and
          choosing it is what filters. */}
      <TextField
        size="small"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="חיפוש תגית..."
        sx={{ maxWidth: 260 }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          },
        }}
      />

      {/* The current level. Wraps rather than scrolls: a level is at most
          twenty-odd chips, and a horizontal scroller hides half of them behind
          a gesture people do not know is available. */}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
        {level.map((node) => {
          const children = byParent.get(node.id) || [];
          // A tag somebody typed on an upload sits at the root, beside the seven
          // agreed headings. Left unmarked, a typo becomes a top-level category
          // with the same standing as תנ"ך — so it says what it is.
          const isFree = node.is_seeded === false;
          const state = stateOf(node);
          // A branch with a hole in it says so, and says how big it still is —
          // the count is what makes "partially" a fact rather than an adjective.
          const partial = isPartiallyIncluded(relations, selection, node.id);
          const mark = partial ? PARTIAL : markFor(state);
          const chosenCount = partial ? countUnder(relations, selection, node.id) : 0;
          // Whether the item count below still describes what this branch would
          // return. It stops doing so the moment anything inside it is excluded —
          // and that is true whether or not the branch itself was chosen.
          const countsWholeBranch = relations
            .descendantsOf(node.id)
            .some((id) => excludedIds.includes(id));
          const chip = (
            <Chip
              size="small"
              // The state, said in the markup rather than only in colour and an
              // icon. A chip's meaning currently lives entirely in how it looks,
              // which leaves it unreadable to anything that is not a pair of
              // eyes — a test included. This is the smallest honest version of
              // that; the aria work belongs with the rest of it.
              data-tag-state={partial ? "partial" : state}
              // The state is in the name, not only in the colour — see SPOKEN.
              aria-label={spokenNameOf(node, state, partial, chosenCount)}
              label={
                <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
                  {mark.icon}
                  <Box
                    component="span"
                    // Struck through rather than merely red: colour alone is not
                    // a statement, and "excluded" is the one state whose meaning
                    // is the opposite of every other chip on the row.
                    sx={isOut(state) ? { textDecoration: "line-through" } : undefined}
                  >
                    {node.name}
                  </Box>
                  {partial && (
                    <Box component="span" sx={{ opacity: 0.75, fontSize: "0.7rem" }}>
                      ({chosenCount})
                    </Box>
                  )}
                  {searching && pathTextOf(node) && (
                    <Box component="span" sx={{ opacity: 0.6, fontSize: "0.7rem" }}>
                      · {pathTextOf(node)}
                    </Box>
                  )}
                  {node.media_count > 0 && (
                    <Box
                      component="span"
                      sx={{
                        opacity: 0.6,
                        fontSize: "0.7rem",
                        // The items under an excluded branch are not coming back
                        // in the results, so the number that counts them is
                        // struck through rather than left reading as a promise.
                        ...(isOut(state) && { textDecoration: "line-through" }),
                      }}
                    >
                      {/* The tilde is the whole point of B4: this number comes
                          from the server and counts the WHOLE subtree, with no
                          filter applied. Once part of the branch has been taken
                          out it is an upper bound, not a result count, and
                          saying "54" beside a branch the user just cut in half
                          is how a filter loses somebody's trust. */}
                      {countsWholeBranch ? `~${node.media_count}` : node.media_count}
                    </Box>
                  )}
                </Box>
              }
              // Red for the two states that REMOVE, primary for the ones that
              // add. The two directions must not share a colour: a chip that
              // takes a branch out of the archive and one that puts it in are
              // opposite instructions, and the row is read at a glance.
              color={state === TAG_STATE.NONE ? "default" : isOut(state) ? "error" : "primary"}
              variant={
                state === TAG_STATE.INCLUDED || state === TAG_STATE.EXCLUDED ? "filled" : "outlined"
              }
              // The body selects. Descending is a button of its own, beside it —
              // see below.
              onClick={() => onCycle(node.id)}
              sx={{
                // An empty branch is dimmed, not hidden — hiding it makes the
                // vocabulary look incomplete, dimming says "nothing here yet".
                // A node that is inherited or contains a choice is never dimmed,
                // because it is part of what is being asked for.
                opacity: node.media_count === 0 && state === TAG_STATE.NONE ? 0.45 : 1,
                // The inherited state is deliberately quieter than a selection:
                // it is not a choice the user made, it is a consequence of one.
                ...((state === TAG_STATE.INHERITED || state === TAG_STATE.INHERITED_EXCLUDED) && {
                  borderStyle: "dashed",
                }),
                // Inherited in either direction is a consequence, not a choice,
                // and reads quieter than the decision that produced it.
                ...(state === TAG_STATE.INHERITED_EXCLUDED && { opacity: 0.7 }),
                // A free tag is visually secondary to the vocabulary. It is not
                // wrong — somebody meant it — but it did not come from the
                // agreed list and should not read as though it did.
                ...(isFree && state === TAG_STATE.NONE && { borderStyle: "dotted", fontStyle: "italic" }),
                "& .MuiChip-deleteIcon": { color: "inherit", opacity: 0.7 },
              }}
            />
          );

          const title = countsWholeBranch
            ? `${mark.title ? `${mark.title} · ` : ""}המספר כולל את כל הענף, גם את מה שהוצא ממנו`
            : mark.title;

          // The chip and the way into it, side by side.
          //
          // The arrow used to be the chip's own "delete" icon, which is what MUI
          // offers for something hanging off a chip. It worked with a mouse and
          // nowhere else: a chip's delete affordance is bound to Backspace and
          // Delete, so a keyboard user descended a branch by pressing a key that
          // means "remove", and nothing announced it as anything else. Both
          // questions here are ordinary — "anything on Chumash" and "this
          // parasha" — and each now has a control that says which it is.
          const withArrow = (
            <Box component="span" sx={{ display: "inline-flex", alignItems: "center" }}>
              {title ? (
                <Tooltip title={title}>
                  <span>{chip}</span>
                </Tooltip>
              ) : (
                chip
              )}
              {children.length > 0 && (
                <IconButton
                  size="small"
                  aria-label={`פתיחת ${node.name}`}
                  onClick={() => openBranch(node)}
                  sx={{ p: 0.25, ml: -0.25, color: "text.secondary" }}
                >
                  <ChevronLeftIcon sx={{ fontSize: 16 }} />
                </IconButton>
              )}
            </Box>
          );

          return <Box key={node.id} component="span">{withArrow}</Box>;
        })}
        {level.length === 0 && (
          <Typography variant="caption" color="text.secondary">
            {searching ? `לא נמצאה תגית התואמת "${term}"` : "אין תגיות ברמה זו"}
          </Typography>
        )}
        {hiddenMatches > 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ width: "100%" }}>
            {`מוצגות ${matches.length} מתוך ${allMatches.length} תגיות — כדאי לצמצם את החיפוש`}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default TagDrilldown;
