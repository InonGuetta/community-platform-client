// A profile picture, from the chosen file or camera frame to what is sent:
// decoded, framed by the person in the crop editor (features/Avatar/
// AvatarCropDialog), and drawn as an AVATAR_SIZE-pixel square JPEG.
//
// Done here, before the upload, so a twelve-megapixel phone photo goes out as
// a few dozen kilobytes and arrives the right way up (createImageBitmap
// applies the photo's EXIF orientation). The server checks the result again
// by its bytes (lib/validate.js → requireAvatarImage); this is about size and
// framing, not trust.
//
// The framing is plain arithmetic, kept apart from the drawing so it can be
// tested without a canvas: the picture is shown in a square viewport of
// `view` pixels, scaled to cover it at zoom 1, and moved by an offset — the
// position of the picture's top-left corner inside the viewport, always ≤ 0,
// so the picture always covers the whole circle.

export const AVATAR_SIZE = 256;
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;
// Above this the browser is asked to decode something no profile picture
// needs to be; refusing it keeps a phone from running out of memory.
export const MAX_SOURCE_BYTES = 20 * 1024 * 1024;

/** Whether a chosen file is worth trying to decode as a picture. @param {File | Blob | null | undefined} file */
export const looksLikePicture = (file) =>
  Boolean(file) && file.size > 0 && file.size <= MAX_SOURCE_BYTES && (!file.type || file.type.startsWith("image/"));

/** The scale at which a width × height picture just covers a `view`-pixel square. */
export const coverScale = (width, height, view) => view / Math.min(width, height);

export const clampZoom = (zoom) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));

/**
 * An offset pulled back inside the range where the picture still covers the
 * viewport.
 * @param {{ x: number, y: number }} offset
 * @param {{ width: number, height: number, view: number, zoom: number }} frame
 */
export const clampOffset = ({ x, y }, { width, height, view, zoom }) => {
  const scale = coverScale(width, height, view) * zoom;
  const clamp = (value, size) => Math.min(0, Math.max(view - size * scale, value));
  return { x: clamp(x, width), y: clamp(y, height) };
};

/** The offset that centres the picture. */
export const centredOffset = ({ width, height, view, zoom }) => {
  const scale = coverScale(width, height, view) * zoom;
  return { x: (view - width * scale) / 2, y: (view - height * scale) / 2 };
};

/**
 * A new zoom applied about a point of the viewport (its centre, or where the
 * wheel or the pinch is), so that point stays under the finger.
 * @param {{ x: number, y: number }} offset
 * @param {number} from  the zoom before
 * @param {number} to    the zoom wanted
 * @param {{ x: number, y: number }} at  the point, in viewport pixels
 * @param {{ width: number, height: number, view: number }} picture
 */
export const zoomAbout = (offset, from, to, at, picture) => {
  const zoom = clampZoom(to);
  const ratio = zoom / from;
  const moved = { x: at.x - (at.x - offset.x) * ratio, y: at.y - (at.y - offset.y) * ratio };
  return { zoom, offset: clampOffset(moved, { ...picture, zoom }) };
};

/**
 * Which square of the original picture the viewport shows — what is drawn.
 * @param {{ x: number, y: number }} offset
 * @param {{ width: number, height: number, view: number, zoom: number }} frame
 */
export const sourceRect = (offset, { width, height, view, zoom }) => {
  const scale = coverScale(width, height, view) * zoom;
  const size = Math.min(view / scale, width, height);
  const sx = Math.min(Math.max(0, -offset.x / scale), width - size);
  const sy = Math.min(Math.max(0, -offset.y / scale), height - size);
  return { sx, sy, size };
};

/**
 * A chosen file decoded, or a rejection when it is not a picture this browser
 * can draw (the caller words it — profile:avatar.notImage). `url` shows it in
 * the crop editor; `release` frees both when the editor closes.
 *
 * @param {Blob} file
 */
export const decodePicture = async (file) => {
  if (!looksLikePicture(file)) throw new Error("not a picture");
  const bitmap = await createImageBitmap(file);
  const url = URL.createObjectURL(file);
  return {
    bitmap,
    url,
    width: bitmap.width,
    height: bitmap.height,
    release: () => {
      URL.revokeObjectURL(url);
      bitmap.close?.();
    },
  };
};

/**
 * The square of `bitmap` the person framed, drawn at AVATAR_SIZE and encoded
 * as the JPEG that is uploaded.
 *
 * @param {CanvasImageSource} bitmap
 * @param {{ sx: number, sy: number, size: number }} rect
 * @returns {Promise<Blob>}
 */
export const renderAvatar = async (bitmap, { sx, sy, size }) => {
  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  const context = canvas.getContext("2d");
  // A transparent PNG would turn black as a JPEG: paint the ground first.
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, AVATAR_SIZE, AVATAR_SIZE);
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, sx, sy, size, size, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
  if (!blob) throw new Error("could not encode the picture");
  return blob;
};

/**
 * One frame of a playing <video> (the camera) as a JPEG, mirrored the way the
 * preview showed it — the person framed themselves in a mirror, and expects
 * that picture.
 * @param {HTMLVideoElement} video
 * @returns {Promise<Blob>}
 */
export const captureFrame = async (video) => {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const context = canvas.getContext("2d");
  context.translate(canvas.width, 0);
  context.scale(-1, 1);
  context.drawImage(video, 0, 0);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
  if (!blob) throw new Error("could not capture the frame");
  return blob;
};
