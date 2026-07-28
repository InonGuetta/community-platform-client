import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Vitest resolves the app's extensionless imports the same way the dev server
  // does, which plain node cannot. The default "node" environment is enough —
  // none of these tests render components, they exercise the logic underneath.
  test: {
    include: ["src/**/*.test.{js,jsx}"],
    environment: "node",
  },
  server: {
    port: 5173,
    proxy: {
      "/api": { target: "http://localhost:3001", changeOrigin: true },
      "/socket.io": { target: "http://localhost:3001", ws: true },
    },
  },
});
