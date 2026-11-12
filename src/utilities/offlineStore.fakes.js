// Test doubles for offlineStore.js (PRD MOB-2). Imported by tests only.

// A Cache Storage that lives in memory: enough of the API for the store.
const pathOf = (key) => new URL(typeof key === "string" ? key : key.url, "http://localhost").pathname;
export const fakeCaches = () => {
  const stores = new Map();
  return {
    stores,
    open: async (name) => {
      if (!stores.has(name)) stores.set(name, new Map());
      const entries = stores.get(name);
      return {
        put: async (key, response) => { entries.set(pathOf(key), response); },
        match: async (key) => entries.get(pathOf(key))?.clone(),
        delete: async (key) => entries.delete(pathOf(key)),
        keys: async () => [...entries.keys()].map((path) => ({ url: `http://localhost${path}` })),
      };
    },
    delete: async (name) => stores.delete(name),
    keys: async () => [...stores.keys()],
  };
};

export const fakeStorage = () => {
  const values = new Map();
  return {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
};
