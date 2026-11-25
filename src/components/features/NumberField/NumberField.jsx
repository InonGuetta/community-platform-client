import { useEffect, useState } from "react";
import TextField from "@mui/material/TextField";
import { useTranslation } from "react-i18next";

// A numeric field that cannot be pushed outside its range (UI_UX_FIXES 1.3).
//
// A bare <input type="number"> lets `-`, `+`, `e` and (for whole numbers) `.`
// through, keeps whatever was pasted, and shows "-2" as "2-" in an RTL page.
// This one: blocks those keys and strips them from a paste, writes the number
// left-to-right, shows the range while the value is outside it, and on blur
// clamps to the range — an empty or unreadable value goes back to
// `defaultValue` (or stays empty when `allowEmpty`, for an optional amount).
//
// The key block sits in the capture phase on the field's root, so a caller's own
// onKeyDownCapture runs first and cannot make it skip.
//
// `value` is a number, or "" while the field is empty; `onChange` is given the
// same. The text being typed lives here, because "" is a state a number cannot be.
const BLOCKED_KEYS = ["-", "+", "e", "E"];

const parse = (text) => {
  if (text === "" || text === null || text === undefined) return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
};

const clamp = (n, min, max) => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n));

const NumberField = ({
  value,
  onChange,
  min,
  max,
  step = 1,
  integer = true,
  defaultValue,
  allowEmpty = false,
  rangeText,
  helperText,
  inputProps,
  onBlur,
  onKeyDownCapture,
  onPaste,
  ...rest
}) => {
  const { t } = useTranslation("common");
  const [text, setText] = useState(value === null || value === undefined ? "" : String(value));

  // Follow the parent when it changes the value from outside (a preset button,
  // a type switch) — but not while the text already says the same number.
  useEffect(() => {
    const incoming = value === null || value === undefined ? "" : value;
    setText((current) => (parse(current) === parse(incoming) ? current : String(incoming)));
  }, [value]);

  const number = parse(text);
  const outOfRange =
    number !== null &&
    ((min !== undefined && number < min) || (max !== undefined && number > max) || (integer && !Number.isInteger(number)));

  let range = rangeText;
  if (range === undefined) {
    if (min !== undefined && max !== undefined) range = t("numberField.between", { min, max });
    else if (min !== undefined) range = t("numberField.atLeast", { min });
    else if (max !== undefined) range = t("numberField.atMost", { max });
  }

  const emit = (next) => {
    setText(next === "" ? "" : String(next));
    onChange?.(next);
  };

  // Everything but digits (and one decimal point, for a field that takes
  // fractions) goes: a pasted "-50" arrives as 50.
  const clean = (raw) => {
    const kept = raw.replace(integer ? /[^0-9]/g : /[^0-9.]/g, "");
    if (integer) return kept;
    const [head, ...tail] = kept.split(".");
    return tail.length ? `${head}.${tail.join("")}` : kept;
  };

  return (
    <TextField
      {...rest}
      type="number"
      value={text}
      onChange={(e) => {
        const next = e.target.value;
        setText(next);
        const n = parse(next);
        onChange?.(n === null ? "" : n);
      }}
      onKeyDownCapture={(e) => {
        onKeyDownCapture?.(e);
        if (e.defaultPrevented) return;
        if (BLOCKED_KEYS.includes(e.key) || (integer && (e.key === "." || e.key === ","))) e.preventDefault();
      }}
      onPaste={(e) => {
        onPaste?.(e);
        if (e.defaultPrevented) return;
        e.preventDefault();
        const pasted = clean(e.clipboardData.getData("text"));
        if (pasted === "") return;
        emit(parse(pasted) ?? "");
      }}
      onBlur={(e) => {
        onBlur?.(e);
        const n = parse(text);
        if (n === null) {
          if (allowEmpty) return emit("");
          if (defaultValue !== undefined) return emit(defaultValue);
          return emit(min ?? "");
        }
        const fixed = clamp(integer ? Math.round(n) : n, min, max);
        if (fixed !== n || String(fixed) !== text) emit(fixed);
      }}
      error={Boolean(rest.error) || outOfRange}
      helperText={outOfRange ? range : helperText}
      inputProps={{ min, max, step, inputMode: integer ? "numeric" : "decimal", dir: "ltr", ...inputProps }}
    />
  );
};

export default NumberField;
