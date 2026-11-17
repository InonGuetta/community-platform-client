import { useEffect, useRef, useState } from "react";
import { captureFrame } from "../../../utilities/avatarImage";

// The camera for a profile picture taken right now: the front camera when
// there is one, shown live, and one frame taken from it.
//
// `open` starts it and closing stops every track — a camera left on is a
// light left on beside the lens. `status` is what the dialog says: starting,
// live, or why not ("denied" — the person or the browser refused; "none" — no
// camera; "failed" — anything else).
//
// Needs a secure page (https, or localhost in development); camera access is
// not offered on any other.

export const cameraSupported = () =>
  typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);

const reasonOf = (err) => {
  if (err?.name === "NotAllowedError" || err?.name === "SecurityError") return "denied";
  if (err?.name === "NotFoundError" || err?.name === "OverconstrainedError") return "none";
  return "failed";
};

export const useCamera = (open) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    setStatus("starting");
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 1280 } }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setStatus("live");
      })
      .catch((err) => {
        if (!cancelled) setStatus(reasonOf(err));
      });
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [open]);

  const capture = () => captureFrame(videoRef.current);

  return { videoRef, status, capture };
};
