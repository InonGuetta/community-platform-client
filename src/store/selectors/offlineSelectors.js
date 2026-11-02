// Lessons kept for listening with no network (PRD MOB-2).
export const selectOfflineItems = (state) => state.offline.items;
export const selectOfflineLoaded = (state) => state.offline.loaded;
export const selectOfflineProgress = (state) => state.offline.progress;

export const selectIsOffline = (id) => (state) => state.offline.items.some((item) => item.id === id);
export const selectOfflineProgressFor = (id) => (state) => state.offline.progress[id] ?? null;
