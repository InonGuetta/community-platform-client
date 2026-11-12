// Lessons kept on this device for listening with no network (PRD MOB-2).
//
// Two stores, each holding what it is good at:
//   - the FILES in Cache Storage, one entry per lesson under a key of our own
//     (never the API's URL, so nothing else ever answers from it). A cache
//     holds hundreds of megabytes on disk without loading them into memory.
//   - the LIST in localStorage: what each saved lesson is called, who teaches
//     it, how big it is, when it was saved and where the listener stopped. It
//     is small, read synchronously, and is all the downloads page needs to
//     draw itself with no server at all.
//
// The two can disagree — a browser short of space may evict the cache and
// leave the list — so `reconcileOffline` drops listed lessons whose file is
// gone, rather than offering a play button that cannot play.
//
// The lessons belong to ONE person: whoever was signed in when they were
// saved. Signing out deletes them (Navbar), and a different user signing in on
// the same device deletes them too (`claimOffline`), so one reader never finds
// another's lessons on a shared computer.

export const OFFLINE_CACHE = "offline-media-v1";
const INDEX_KEY = "offlineMedia:v1";

// Ours, not a server route: the cache is looked up by this key alone.
export const offlineFileKey = (id) => `/offline/media/${id}`;

const emptyIndex = () => ({ ownerId: null, items: [] });

// localStorage can throw (site data blocked, an old private mode). Every read
// and write goes through these two so a refusal means "nothing saved", not a
// crash on the page that asked.
const defaultStorage = () => {
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null;
  }
};

export const readIndex = (storage = defaultStorage()) => {
  try {
    const parsed = JSON.parse(storage?.getItem(INDEX_KEY) || "null");
    if (!parsed || !Array.isArray(parsed.items)) return emptyIndex();
    return {
      ownerId: parsed.ownerId ?? null,
      items: parsed.items.filter((item) => Number.isInteger(item?.id)),
    };
  } catch {
    return emptyIndex();
  }
};

export const writeIndex = (index, storage = defaultStorage()) => {
  try {
    storage?.setItem(INDEX_KEY, JSON.stringify(index));
  } catch {
    // Not saved; the files are still in the cache and reconcile will not drop
    // them — it only removes list entries, never files.
  }
};

// Only what the downloads page shows, copied from the lesson row at the moment
// of saving. Copied rather than looked up later, because later is offline.
export const offlineEntry = (media, size, now = Date.now()) => ({
  id: media.id,
  title: media.title || "שיעור",
  creator_name: media.creator_name ?? null,
  course_title: media.course_title ?? null,
  media_type: media.media_type,
  duration_seconds: media.duration_seconds ?? null,
  size,
  savedAt: new Date(now).toISOString(),
  position: 0,
});

// Newest first, the order the page lists them in.
export const withEntry = (index, entry) => ({
  ...index,
  items: [entry, ...index.items.filter((item) => item.id !== entry.id)],
});

export const withoutEntry = (index, id) => ({
  ...index,
  items: index.items.filter((item) => item.id !== id),
});

export const withPosition = (index, id, seconds) => ({
  ...index,
  items: index.items.map((item) =>
    item.id === id ? { ...item, position: Math.max(0, Math.floor(seconds || 0)) } : item
  ),
});

export const offlineSupported = () => typeof caches !== "undefined";

export const listOffline = () => readIndex().items;

export const isQuotaError = (err) =>
  err?.name === "QuotaExceededError" || err?.code === 22 || /quota/i.test(err?.message || "");

// Keeps the file and lists it. A full disk comes back as a QuotaExceededError
// from `put`, and nothing is listed then.
export const storeOffline = async (media, blob) => {
  const cache = await caches.open(OFFLINE_CACHE);
  await cache.put(
    offlineFileKey(media.id),
    new Response(blob, {
      headers: {
        "Content-Type": blob.type || "application/octet-stream",
        "Content-Length": String(blob.size),
      },
    })
  );
  const index = withEntry(readIndex(), offlineEntry(media, blob.size));
  writeIndex(index);
  return index.items;
};

export const removeOffline = async (id) => {
  if (offlineSupported()) {
    const cache = await caches.open(OFFLINE_CACHE);
    await cache.delete(offlineFileKey(id));
  }
  const index = withoutEntry(readIndex(), id);
  writeIndex(index);
  return index.items;
};

export const clearOffline = async () => {
  if (offlineSupported()) await caches.delete(OFFLINE_CACHE);
  writeIndex(emptyIndex());
  return [];
};

// The lessons on this device are the signed-in user's — or, when someone else
// saved them, nobody's any more.
export const claimOffline = async (userId) => {
  const index = readIndex();
  if (index.ownerId != null && index.ownerId !== userId) {
    await clearOffline();
    writeIndex({ ownerId: userId, items: [] });
    return [];
  }
  writeIndex({ ...index, ownerId: userId });
  return index.items;
};

// Drops listed lessons whose file the browser has evicted.
export const reconcileOffline = async () => {
  const index = readIndex();
  if (!offlineSupported() || index.items.length === 0) return index.items;
  const cache = await caches.open(OFFLINE_CACHE);
  const present = new Set((await cache.keys()).map((request) => new URL(request.url).pathname));
  const kept = index.items.filter((item) => present.has(offlineFileKey(item.id)));
  if (kept.length !== index.items.length) writeIndex({ ...index, items: kept });
  return kept;
};

// The saved file, for the player. Null when it is not on the device.
export const offlineFile = async (id) => {
  if (!offlineSupported()) return null;
  const cache = await caches.open(OFFLINE_CACHE);
  const response = await cache.match(offlineFileKey(id));
  return response ? response.blob() : null;
};

// Where the listener stopped, so the next play resumes there. Kept with the
// lesson rather than sent to the server: there is no server to send it to.
export const saveOfflinePosition = (id, seconds) => {
  writeIndex(withPosition(readIndex(), id, seconds));
};

export const offlinePosition = (id) => readIndex().items.find((item) => item.id === id)?.position ?? 0;

// { usage, quota } in bytes, or null where the browser will not say.
export const storageEstimate = async () => {
  try {
    const estimate = await navigator.storage?.estimate?.();
    return estimate ? { usage: estimate.usage ?? 0, quota: estimate.quota ?? 0 } : null;
  } catch {
    return null;
  }
};

// Asks the browser not to evict the saved lessons when space runs low. It may
// say no (or not ask the user at all); the lessons are kept either way, only
// less firmly.
export const keepStorage = async () => {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
};

// "12.4 MB" — for sizes on the downloads page.
export const formatBytes = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 MB";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  if (mb >= 10) return `${Math.round(mb)} MB`;
  return `${mb.toFixed(1)} MB`;
};

// The progress of one download, 0–100, or null when the size is not known —
// the audio of a video is transcoded as it is sent, and has no length up front.
export const percentOf = (received, total) =>
  Number.isFinite(total) && total > 0 ? Math.min(100, Math.round((received / total) * 100)) : null;
