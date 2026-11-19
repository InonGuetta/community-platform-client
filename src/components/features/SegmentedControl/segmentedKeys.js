// Where an arrow key takes the focus in a segmented control that behaves as a
// radio group: to the next or previous option that can be chosen, wrapping
// around, skipping disabled ones. "Next" is the way a line runs, so in rtl
// ArrowLeft goes forward. Home and End go to the first and last. Any other key
// — or no option that can be chosen — returns null.
export const nextIndex = (options, current, key, rtl = false) => {
  const enabled = options.map((o, i) => (o.disabled ? null : i)).filter((i) => i !== null);
  if (enabled.length === 0) return null;
  if (key === "Home") return enabled[0];
  if (key === "End") return enabled[enabled.length - 1];
  const forwardKeys = ["ArrowDown", rtl ? "ArrowLeft" : "ArrowRight"];
  const backKeys = ["ArrowUp", rtl ? "ArrowRight" : "ArrowLeft"];
  const step = forwardKeys.includes(key) ? 1 : backKeys.includes(key) ? -1 : 0;
  if (step === 0) return null;
  const at = enabled.indexOf(current);
  if (at === -1) return step === 1 ? enabled[0] : enabled[enabled.length - 1];
  return enabled[(at + step + enabled.length) % enabled.length];
};
