// Format a number of seconds as a timestamp.
// Under an hour → "m:ss" (e.g. 5:21). An hour or more → "h:mm:ss"
// (e.g. 5894s → 1:38:14, not the broken 98:14).
export const formatTime = (totalSeconds) => {
  const total = Math.max(0, Math.floor(totalSeconds || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const ss = String(seconds).padStart(2, "0");
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${ss}`;
  return `${minutes}:${ss}`;
};
