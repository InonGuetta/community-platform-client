import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite boots in well under a second; the API server needs a few (it imports the
// AWS/OpenAI/Stripe/Bull clients before it listens, and `node --watch` re-does
// that on every save). Anything the browser sends inside that window gets
// ECONNREFUSED, and Vite's built-in proxy error handler answers a plain-text
// **500** — indistinguishable from the API genuinely throwing. That is why a
// first login used to fail two or three times: the request never reached
// Express, but the client had no way to tell and no reason to retry.
//
// 503 + the { message } shape the API itself uses says the right thing: the
// upstream is unavailable and the request was never processed, so replaying it
// is safe. axiosInstance retries exactly this.
const answerUnavailable = (proxy) => {
  proxy.on("error", (err, req, res) => {
    // A failed websocket upgrade hands back the raw socket, which has no
    // writeHead — there is no HTTP response to answer with. Vite's own handler,
    // which runs after this one, closes that socket; leave it to do so.
    if (typeof res?.writeHead !== "function") return;
    if (res.headersSent || res.writableEnded) return;
    res.writeHead(503, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: "API server unavailable", code: "API_UNAVAILABLE" }));
  });
};

export default defineConfig({
  plugins: [react()],
  // Vitest resolves the app's extensionless imports the same way the dev server
  // does, which plain node cannot. The default "node" environment is enough —
  // none of these tests render components, they exercise the logic underneath.
  test: {
    include: ["src/**/*.test.{js,jsx}"],
    environment: "node",
    // Mirrors LOG_LEVEL=error in the server's test/setup.js, and for the same
    // reason: several of these tests drive failure paths on purpose (every
    // retry, every 401), and at the dev default of "debug" the real assertion
    // output is buried under the tracing they produce.
    env: { VITE_LOG_LEVEL: "error" },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": { target: "http://localhost:3001", changeOrigin: true, configure: answerUnavailable },
      "/socket.io": { target: "http://localhost:3001", ws: true, configure: answerUnavailable },
    },
  },
});
