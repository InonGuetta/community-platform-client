import { useRef } from "react";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Tooltip from "@mui/material/Tooltip";
import { useDirection } from "../../../i18n/useDirection";
import { RADIUS, SHADOW } from "../../../theme/tokens";
import { nextIndex } from "./segmentedKeys";

// A segmented control (component 9): a grey pill track holding a row of
// options, the chosen one raised in white. One choice at a time.
//
//   options   [{ value, label, disabled?, tooltip? }] — `tooltip` explains a
//             disabled option (the monthly donation, D-38)
//   value     the chosen option's value
//   onChange  (value) => …, only when the choice changes
//   label     the group's accessible name
//
// Two semantics, chosen by what the control does:
//   "pressed" (default) — a group of toggle buttons, each with aria-pressed.
//     Every option is its own tab stop and is found as a button by its name,
//     which is what the sign-up role picker's tests and e2e rely on.
//   "radio" — a radiogroup of radios with aria-checked: one tab stop, and the
//     arrow keys move the choice (in the reading direction), as a native radio
//     group does. For a choice of view or mode.
const SegmentedControl = ({ options, value, onChange, label, semantics = "pressed", fullWidth = false, size = "medium", sx = [] }) => {
  const { rtl } = useDirection();
  const refs = useRef([]);
  const radio = semantics === "radio";
  const chosenIndex = options.findIndex((o) => o.value === value);
  // In a radio group the one tab stop is the chosen option, or the first that
  // can be chosen when none is.
  const tabStop = chosenIndex >= 0 ? chosenIndex : options.findIndex((o) => !o.disabled);

  const choose = (option) => {
    if (!option.disabled && option.value !== value) onChange?.(option.value);
  };

  const handleKeyDown = (event, index) => {
    if (!radio) return;
    const to = nextIndex(options, index, event.key, rtl);
    if (to === null) return;
    event.preventDefault();
    refs.current[to]?.focus();
    choose(options[to]);
  };

  const height = size === "small" ? 32 : 36;

  return (
    <Box
      role={radio ? "radiogroup" : "group"}
      aria-label={label}
      sx={[
        {
          display: fullWidth ? "flex" : "inline-flex",
          alignItems: "center",
          gap: 0.5,
          p: 0.5,
          borderRadius: `${RADIUS.pill}px`,
          bgcolor: "surface.fill",
          maxWidth: "100%",
          overflowX: "auto",
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {options.map((option, index) => {
        const selected = index === chosenIndex;
        const item = (
          <ButtonBase
            key={option.value}
            ref={(node) => {
              refs.current[index] = node;
            }}
            disabled={option.disabled}
            onClick={() => choose(option)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            {...(radio
              ? { role: "radio", "aria-checked": selected, tabIndex: index === tabStop ? 0 : -1 }
              : { "aria-pressed": selected })}
            sx={{
              flex: fullWidth ? 1 : "0 0 auto",
              height,
              px: size === "small" ? 2 : 2.5,
              borderRadius: `${RADIUS.pill}px`,
              fontSize: size === "small" ? 13 : 14,
              fontWeight: 600,
              whiteSpace: "nowrap",
              color: selected ? "text.primary" : "text.secondary",
              bgcolor: selected ? "surface.raised" : "transparent",
              boxShadow: selected ? SHADOW.sm : "none",
              transition: "background-color .2s, color .2s, box-shadow .2s",
              "&:hover": { color: "text.primary" },
              "&.Mui-disabled": { opacity: 0.5 },
            }}
          >
            {option.label}
          </ButtonBase>
        );
        if (!option.tooltip) return item;
        // A disabled button fires no pointer events, so the tooltip hangs on a
        // wrapper that does.
        return (
          <Tooltip key={option.value} title={option.tooltip}>
            <Box component="span" sx={{ display: "inline-flex", flex: fullWidth ? 1 : "0 0 auto" }}>
              {item}
            </Box>
          </Tooltip>
        );
      })}
    </Box>
  );
};

export default SegmentedControl;
