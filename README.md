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

## Configuration

`.env.example` documents `VITE_ICE_SERVERS`, which matters if video connects
for some participants and not others.
