import { useEffect, useRef, useState } from "react";
import {
  MIN_ZOOM, MAX_ZOOM, clampOffset, centredOffset, zoomAbout, sourceRect, coverScale,
} from "../../../utilities/avatarImage";

// The crop editor's state: where the picture sits under the circle and how
// far it is zoomed, moved by dragging (mouse, finger), pinching (two
// fingers), the wheel, the slider, and the keyboard (arrows move, + and −
// zoom). The arithmetic is utilities/avatarImage.js; this is the input.
//
// `picture` is { width, height } of the decoded picture; `view` the
// viewport's size in pixels. Positions are physical pixels of the viewport,
// which is laid out left-to-right in every language (it is a picture, not
// text) — see AvatarCropDialog.

const KEY_STEP = 12;
const ZOOM_STEP = 0.2;

export const useAvatarCrop = (picture, view) => {
  const frame = (zoom) => ({ width: picture?.width ?? 1, height: picture?.height ?? 1, view, zoom });
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  // Pointers down on the viewport: one drags, two pinch.
  const pointers = useRef(new Map());
  const gesture = useRef(null);

  // A new picture starts centred and unzoomed.
  useEffect(() => {
    if (!picture) return;
    setZoom(MIN_ZOOM);
    setOffset(centredOffset({ width: picture.width, height: picture.height, view, zoom: MIN_ZOOM }));
  }, [picture, view]);

  const centre = { x: view / 2, y: view / 2 };
  const zoomTo = (next, at = centre) => {
    const result = zoomAbout(offset, zoom, next, at, frame(zoom));
    setZoom(result.zoom);
    setOffset(result.offset);
  };

  const local = (event) => {
    const box = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - box.left, y: event.clientY - box.top };
  };
  const distance = ([a, b]) => Math.hypot(a.x - b.x, a.y - b.y);
  const midpoint = ([a, b]) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

  const onPointerDown = (event) => {
    event.currentTarget.setPointerCapture?.(event.pointerId);
    pointers.current.set(event.pointerId, local(event));
    const points = [...pointers.current.values()];
    gesture.current = points.length >= 2
      ? { kind: "pinch", distance: distance(points), zoom }
      : { kind: "drag", start: points[0], offset };
  };

  const onPointerMove = (event) => {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, local(event));
    const points = [...pointers.current.values()];
    const g = gesture.current;
    if (g?.kind === "pinch" && points.length >= 2) {
      const ratio = distance(points) / (g.distance || 1);
      zoomTo(g.zoom * ratio, midpoint(points));
    } else if (g?.kind === "drag") {
      const [p] = points;
      setOffset(clampOffset({ x: g.offset.x + p.x - g.start.x, y: g.offset.y + p.y - g.start.y }, frame(zoom)));
    }
  };

  const onPointerUp = (event) => {
    pointers.current.delete(event.pointerId);
    const points = [...pointers.current.values()];
    gesture.current = points.length === 1 ? { kind: "drag", start: points[0], offset } : null;
  };

  const onWheel = (event) => {
    event.preventDefault?.();
    zoomTo(zoom * (event.deltaY < 0 ? 1.1 : 1 / 1.1), local(event));
  };

  const onKeyDown = (event) => {
    const move = { ArrowLeft: [KEY_STEP, 0], ArrowRight: [-KEY_STEP, 0], ArrowUp: [0, KEY_STEP], ArrowDown: [0, -KEY_STEP] }[event.key];
    if (move) {
      event.preventDefault();
      setOffset(clampOffset({ x: offset.x + move[0], y: offset.y + move[1] }, frame(zoom)));
    } else if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      zoomTo(zoom + ZOOM_STEP);
    } else if (event.key === "-") {
      event.preventDefault();
      zoomTo(zoom - ZOOM_STEP);
    }
  };

  const scale = picture ? coverScale(picture.width, picture.height, view) * zoom : 1;

  return {
    zoom,
    offset,
    // The picture's drawn size, for the <img>.
    imageWidth: (picture?.width ?? 0) * scale,
    imageHeight: (picture?.height ?? 0) * scale,
    setZoom: (next) => zoomTo(next),
    zoomIn: () => zoomTo(zoom + ZOOM_STEP),
    zoomOut: () => zoomTo(zoom - ZOOM_STEP),
    minZoom: MIN_ZOOM,
    maxZoom: MAX_ZOOM,
    rect: () => sourceRect(offset, frame(zoom)),
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp, onWheel, onKeyDown },
  };
};
