import { mediaTypes } from "../../../../utilities/constant";

// The archive's media-type toggle: "הכל" plus one button per type, as a
// multi-select that behaves the way a row of filter chips is expected to.
//
//   * Nothing chosen is "הכל", and ONLY "הכל" is pressed. Pressing a type from
//     there shows that type alone.
//   * Pressing another type adds it; pressing a pressed one takes it out.
//   * Taking out the last type goes back to "הכל", and choosing every type is
//     "הכל" too — the archive never filters down to nothing.
//   * "הכל" always means everything. Pressing it while it is already pressed
//     does nothing.
//
// ── What this replaced, and why ─────────────────────────────────────────────
//
// It used to draw every type's button pressed under "הכל", on the reasoning
// that every type was being shown. That made the first press do the opposite
// of what it said: from the default, pressing "וידאו" took video OUT and showed
// audio and reading. And "הכל" pressed a second time brought back whatever
// choice it had replaced, so the button labelled "everything" could be the one
// that stopped showing everything. Both are gone.
//
// ── One spelling for "everything" ───────────────────────────────────────────
//
// The selection is a list of types, and every type chosen is spelled as the
// empty list — never as the full one — so the address, the request and the
// badge only ever have one state to recognise. Empty also means what it says on
// the wire: no `type` parameter, no filter.

export const ALL_TYPES = Object.values(mediaTypes);

// Always in the vocabulary's order, so the same choice made in a different order
// is the same address.
const canonical = (types) => {
  const chosen = ALL_TYPES.filter((t) => types.includes(t));
  return chosen.length === ALL_TYPES.length ? [] : chosen;
};

export const isAllTypes = (selected) => selected.length === 0;

/** Whether one type's button is pressed. Under "הכל" none of them is. */
export const isTypePressed = (selected, type) => selected.includes(type);

/** Pressing one type's button: in if it was out, out if it was in. */
export const toggleType = (selected, type) =>
  canonical(selected.includes(type) ? selected.filter((t) => t !== type) : [...selected, type]);

/** Pressing "הכל": everything, whatever was chosen before. */
export const pressAllTypes = () => [];

/** A list of types from outside — an address — reduced to one the toggle can show. */
export const readTypes = (types) => canonical((types || []).filter((t) => ALL_TYPES.includes(t)));
