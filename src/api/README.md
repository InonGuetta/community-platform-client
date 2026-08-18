# `src/api/` — the client's view of the server's contract

Every URL the client calls lives in this directory, one module per resource, and
nowhere else. A structural test (`src/imports.test.js`) enforces it: importing
`axiosInstance` from anywhere but here fails the test run.

## Why

The URLs used to be inline in the ~20 thunk files and three components that
happened to need them. Nothing was wrong with any single call site, but the set
of them had two problems:

1. **A route rename in the server had no findable counterpart here.** The only
   way to answer "what does the client call?" was a text search, and the only
   way to change a path was to trust that the search found every copy.
2. **The server's own inconsistency was invisible.** These are real, current
   routes:

   ```
   GET    /media/get-all          POST /media/upload
   PUT    /media/update/:id       DELETE /media/delete/:id
   GET    /notes                  POST /notes
   PUT    /notes/:id              DELETE /notes/:id
   PUT    /notes/order
   ```

   Media spells the verb into the path; notes and bookmarks are REST. Spread
   across twenty files that reads as noise you have to memorise per resource.
   Collected here it reads as a list — and as something to fix on the server one
   day, with exactly one place to update when that happens.

## Shape

Each module exports one namespace object of thin functions:

```js
import { mediaApi } from "../../../api/mediaApi";

const item = await mediaApi.getOne(id);   // already unwrapped from response.data
```

The rules these follow:

- **Thin.** A function here builds a URL, picks the method, and unwraps
  `response.data`. That is all.
- **No error handling.** Errors propagate untouched so the caller decides:
  thunks turn them into `rejectWithValue`, components into local state. The
  interceptors in `utilities/axiosInstance.js` have already normalised the
  failure by the time it arrives.
- **No Redux.** Nothing here imports a store, a slice or an action — that is
  what keeps this layer usable from a component (`AdminDashboard`, `DonateForm`)
  as well as from a thunk, and what keeps it out of the import cycle the store
  and `axiosInstance` are carefully kept out of.
