import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { createBuildId, versionEmitPlugin } from "./vite.version";

const buildId = createBuildId();

export default defineConfig({
  base: "/",
  define: {
    __APP_BUILD_ID__: JSON.stringify(buildId),
  },
  plugins: [react(), versionEmitPlugin(buildId)],
  server: {
    host: "0.0.0.0",
    port: 5180,
    strictPort: true,
  },
  preview: {
    host: "0.0.0.0",
    port: 4180,
    strictPort: true,
  },
});
