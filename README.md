# community-platform-client

```bash
npm run dev     # dev server on :5173, proxying /api to the backend
npm run build
npm test
```

## Tests

Vitest, in the default `node` environment — none of these render components,
they exercise the logic underneath. Run with `npm test`.

They concentrate on the things that fail quietly:

- **peerMesh** — the WebRTC signalling. There is no browser, camera or second
  peer here, so the mesh takes its connection factory and transport as
  arguments; that is what makes candidate ordering, peer reuse and teardown
  testable at all.
- **imports** — a structural guard. Bundlers tolerate import cycles, so one
  does not fail the build; it fails at runtime as an undefined binding. Two
  design choices exist purely to avoid a cycle, and this stops them being
  undone by accident.
- **store** — that a transcript save merges rather than replaces (the response
  carries no chunks), and that the memoised selectors keep a stable reference.
- **axiosInstance** — which responses count as an expired session, and which
  are ordinary traffic that must not clear it.
- **pollingSchedule** — the backoff and the ceiling that stops the page polling
  a transcript no worker will ever finish.

### Linting

`npm run lint`. Two rule choices are deliberate and explained in
`eslint.config.js`:

- `react-hooks/exhaustive-deps` is a **warning**, not an error. The obvious way
  to satisfy it — add the missing dependency — is often the wrong fix. An
  effect that lists a callback its parent rebuilds every render tears itself
  down and back up continuously; that was a real bug in the video room, and the
  fix was the opposite, removing it from the array and holding it in a ref. The
  rule cannot tell those apart. Every deliberate omission carries a comment
  saying why.
- `eslint-plugin-react-hooks` 7 bundles the React Compiler's rule family.
  `preserve-manual-memoization` and `set-state-in-effect` fire on correct code
  here and are off; the rest stay on.

## Configuration

`.env.example` documents `VITE_ICE_SERVERS`, which matters if video connects
for some participants and not others.

## Known debt

Deliberately not addressed, recorded so the reasoning is not lost:

- **State synchronised inside effects** (`set-state-in-effect`, six places).
  Resetting derived state when a media id or note selection changes. The
  idiomatic fix is remounting via a `key` rather than syncing in an effect, but
  that restructures four working files and the UI layer has no test coverage.
  Revisit alongside component tests.
- **No pagination on the media list.** `/api/media/get-all` returns every row
  and the archive filters client-side even though the server accepts a search
  parameter. Premature at the current library size; revisit in the hundreds.
- **`react-router` open-redirect advisory.** The fix needs react-router 7, a
  major upgrade of the routing layer. Not reachable here — every dynamic
  navigation target is a server-issued value behind a literal path prefix.
- **The AI endpoints run synchronously inside the request.** `fix-hebrew` and
  `key-point-headings` take minutes on a long transcript. They are rate limited
  and guarded against concurrent runs, but belong on the queue with the client
  polling, which is a feature rather than a fix.
