import { buildTagRelations } from "../../pages/archive/componentsArchive/tagStates";

// Turning the taxonomy into a list somebody can pick from.
//
// A module of its own rather than part of the picker, because what it produces
// has a property the component cannot state and a browser cannot check quickly:
// the options must be ORDERED so that each group appears once. MUI renders a
// header per run of equal group values, so an unsorted list produces the same
// heading four times with a few tags under each — and with freeSolo typing it
// stops being cosmetic and hangs.

// What a top-level tag is grouped under. It has no ancestors, so it has no path
// — and an empty group is not a group: MUI renders one header per RUN of equal
// values, so several of them scattered through the list produce repeated empty
// headers, which it warns about and, with freeSolo typing, hangs on.
export const ROOT_GROUP = "כותרות ראשיות";

export const tagOptionsFrom = (nodes = []) => {
  const relations = buildTagRelations(nodes);
  return (
    nodes
      .map((node) => ({
        id: node.id,
        name: node.name,
        // Grouped by where the tag sits. Without it the list is a few hundred
        // words with five of them appearing twice and no way to tell which is
        // which.
        path: relations
          .ancestorsOf(node.id)
          .map((id) => relations.byId.get(id)?.name)
          .filter(Boolean)
          .join(" ← "),
      }))
      // SORTED by group, and that is a requirement rather than a nicety: a
      // grouped list whose groups are not contiguous gets a fresh header every
      // time the value changes back, so one branch appears four times under four
      // identical headings.
      .sort((a, b) => (a.path || ROOT_GROUP).localeCompare(b.path || ROOT_GROUP, "he") || a.name.localeCompare(b.name, "he"))
  );
};

