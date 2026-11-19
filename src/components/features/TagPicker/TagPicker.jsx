import { useMemo } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import { MAX_TAGS } from "../../../utilities/constant";
import { rootGroup, tagOptionsFrom } from "./tagOptions";
import { useTranslation } from "react-i18next";

// Choosing the tags an item carries.
//
// It exists as its own component because there are now two places that do it —
// the upload form and the edit dialog — and they must offer the same vocabulary,
// the same disambiguation and the same cap. A second copy of an Autocomplete is
// cheap to write and expensive to keep: the day the taxonomy grows a rule, one
// of the two would keep the old one, and the difference would show up as items
// filed under a heading the other form cannot produce.
//
// ── Two kinds of value ──────────────────────────────────────────────────────
//
// A pick from the taxonomy is an OBJECT with an id, and that is the only kind
// this produces. Typing used to be allowed too, and whatever was typed became a
// root tag on save; a new tag now goes through "הוסף תגית" (TagProposalsSection)
// with a place in the tree, and waits for an admin's approval. The string
// branches below stay because a caller may still hold a value from before.
// The id is what disambiguates the five names that occur in two branches.
//
// The relations come from the filter's own model rather than a second walk of
// the tree — the path shown beside each option is the same path the drill-down
// shows, and one of them being computed differently is exactly the kind of
// difference nobody notices until two screens disagree.

const TagPicker = ({
  nodes = [],
  value = [],
  onChange,
  max = MAX_TAGS,
  // Absent, the shared words (tags:label, tags:helper).
  label,
  helperText,
}) => {
  const { t } = useTranslation("tags");
  const options = useMemo(() => tagOptionsFrom(nodes), [nodes]);

  return (
    <Autocomplete
      multiple
      options={options}
      noOptionsText={t("noOptions")}
      value={value}
      onChange={(_, next) => onChange(next.slice(0, max))}
      // An option is an object from the taxonomy; a typed one is a string. Both
      // are allowed, and this has to survive either.
      getOptionLabel={(option) => (typeof option === "string" ? option : option.name)}
      isOptionEqualToValue={(option, chosen) =>
        typeof option === "string" || typeof chosen === "string"
          ? option === chosen
          : option.id === chosen.id
      }
      groupBy={(option) => (typeof option === "string" ? rootGroup() : option.path || rootGroup())}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label ?? t("label")}
          placeholder={value.length >= max ? "" : t("placeholder")}
          helperText={helperText ?? t("helper", { max: MAX_TAGS })}
        />
      )}
    />
  );
};

export default TagPicker;
