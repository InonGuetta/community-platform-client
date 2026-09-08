import { describe, it, expect } from "vitest";
import { tagOptionsFrom, ROOT_GROUP } from "./tagOptions";

// The list the picker offers, and the one property of it that is not visual
// taste: MUI draws a group header per RUN of equal group values, so a list whose
// groups are not contiguous shows the same heading several times with a few tags
// under each. Against the real vocabulary — 262 nodes under seven headings —
// dropping the sort produced thirty repeated headings, and with freeSolo typing
// the component stopped responding rather than merely looking wrong.

// The shape that produces the failure: several roots, a name that occurs in two
// branches, and a tag somebody typed sitting at the root beside the headings.
const TREE = [
  { id: 1, name: 'תנ"ך', parent_id: null },
  { id: 2, name: "תורה", parent_id: 1 },
  { id: 3, name: "בראשית", parent_id: 2 },
  { id: 4, name: "ויחי", parent_id: 3 },
  { id: 5, name: "דברים", parent_id: 2 },
  { id: 6, name: "שופטים", parent_id: 5 },
  { id: 7, name: "נביאים", parent_id: 1 },
  { id: 8, name: "שופטים", parent_id: 7 },
  { id: 20, name: "מוסר וחסידות", parent_id: null },
  { id: 21, name: "תשובה", parent_id: 20 },
  { id: 30, name: "הלכה", parent_id: null },
  { id: 40, name: "שיעור לנוער", parent_id: null },
];

const groupsOf = (options) => options.map((o) => o.path || ROOT_GROUP);
const headerRuns = (groups) => groups.filter((g, i) => g !== groups[i - 1]);

describe("the order the options come in", () => {
  it("puts every group in one run, so each heading is drawn once", () => {
    const groups = groupsOf(tagOptionsFrom(TREE));
    const runs = headerRuns(groups);
    expect(runs.length).toBe(new Set(groups).size);
  });

  it("never leaves a group empty", () => {
    // An empty group is not a group: it renders as a blank heading, once per run.
    expect(groupsOf(tagOptionsFrom(TREE)).filter((g) => !g)).toEqual([]);
  });

  it("gathers the top-level headings under one name", () => {
    const options = tagOptionsFrom(TREE);
    const roots = options.filter((o) => !o.path);
    expect(roots.map((o) => o.name).sort()).toEqual(
      ["הלכה", "מוסר וחסידות", "שיעור לנוער", 'תנ"ך'].sort()
    );
  });

  it("holds every node, and only once", () => {
    const options = tagOptionsFrom(TREE);
    expect(options.length).toBe(TREE.length);
    expect(new Set(options.map((o) => o.id)).size).toBe(TREE.length);
  });
});

describe("what each option carries", () => {
  // Five names in the real taxonomy occur in two branches, so the name alone
  // cannot say which was meant — the path is the disambiguation.
  it("gives a repeated name a path that tells the two apart", () => {
    const options = tagOptionsFrom(TREE);
    const both = options.filter((o) => o.name === "שופטים");
    expect(both).toHaveLength(2);
    expect(both[0].path).not.toBe(both[1].path);
    expect(both.map((o) => o.path).sort()).toEqual(
      ['תנ"ך ← תורה ← דברים', 'תנ"ך ← נביאים'].sort()
    );
  });

  it("gives a tag at the root no path at all", () => {
    const free = tagOptionsFrom(TREE).find((o) => o.name === "שיעור לנוער");
    expect(free.path).toBe("");
  });

  it("has nothing to offer for an empty vocabulary", () => {
    expect(tagOptionsFrom([])).toEqual([]);
    expect(tagOptionsFrom()).toEqual([]);
  });
});
