import { useRef, useState } from "react";

// A video tile plays itself, muted, while the pointer rests on it — the
// preview the old card had, kept over the cover (D-17). Nothing happens for
// any other type, and nothing on a touch screen, which has no hover.
export const useVideoPreview = (isVideo) => {
  const videoRef = useRef(null);
  const [previewing, setPreviewing] = useState(false);

  const start = () => {
    if (!isVideo) return;
    setPreviewing(true);
    const v = videoRef.current;
    if (v) {
      v.currentTime = 0;
      v.play?.()?.catch?.(() => {});
    }
  };
  const stop = () => {
    if (!isVideo) return;
    setPreviewing(false);
    const v = videoRef.current;
    if (v) {
      v.pause?.();
      v.currentTime = 0;
    }
  };

  return { videoRef, previewing, start, stop };
};

export default useVideoPreview;
