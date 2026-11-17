// A profile picture as it is sent: the middle square of what the person chose,
// drawn at AVATAR_SIZE pixels and encoded as a JPEG.
//
// Done here, before the upload, so a twelve-megapixel phone photo goes out as
// a few dozen kilobytes and arrives the right way up (createImageBitmap
// applies the photo's EXIF orientation). The server checks the result again
// by its bytes (lib/validate.js → requireAvatarImage); this is about size and
// shape, not trust.

export const AVATAR_SIZE = 256;
// Above this the browser is asked to decode something no profile picture
// needs to be; refusing it keeps a phone from running out of memory.
export const MAX_SOURCE_BYTES = 20 * 1024 * 1024;

/**
 * The largest centred square inside a width × height picture.
 * @param {number} width
 * @param {number} height
 */
export const squareCrop = (width, height) => {
  const size = Math.min(width, height);
  return { sx: Math.round((width - size) / 2), sy: Math.round((height - size) / 2), size };
};

/** Whether a chosen file is worth trying to decode as a picture. @param {File | Blob | null | undefined} file */
export const looksLikePicture = (file) =>
  Boolean(file) && file.size > 0 && file.size <= MAX_SOURCE_BYTES && (!file.type || file.type.startsWith("image/"));

/**
 * The picture to upload, or a rejection when the file is not a picture this
 * browser can draw (the caller words it — profile:avatar.notImage).
 *
 * @param {File} file
 * @returns {Promise<Blob>}
 */
export const prepareAvatar = async (file) => {
  if (!looksLikePicture(file)) throw new Error("not a picture");
  const bitmap = await createImageBitmap(file);
  try {
    const { sx, sy, size } = squareCrop(bitmap.width, bitmap.height);
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
  } finally {
    bitmap.close?.();
  }
};
