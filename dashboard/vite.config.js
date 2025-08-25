// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173, // Vite dev server
    strictPort: true,
    proxy: {
      // forward /api/* requests to your local Express server in dev
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      // if you ever need OSRM directly from the browser (usually you don’t),
      // add another proxy here. Your server already proxies OSRM, so this is optional.
      // "/osrm": { target: "http://localhost:5000", changeOrigin: true },
    },
  },
  // If you deploy under a subpath, set base here. Otherwise default is fine.
  // base: "/",
});
