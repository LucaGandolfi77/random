import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), VitePWA({
    registerType: "autoUpdate",
    includeAssets: ["favicon.ico", "robots.txt", "icons/*"],
    manifest: {
      name: "ML Assurance Workbench",
      short_name: "ML Assurance",
      description: "ECSS ML Assurance Workbench - Data Readiness Inspector",
      theme_color: "#0f172a",
      background_color: "#0f172a",
      display: "standalone",
      orientation: "any",
      icons: [
        { src: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
        { src: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
      ],
    },
    workbox: {
      globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/localhost:8000\/api\/.*/i,
          handler: "NetworkFirst",
          options: {
            cacheName: "api-cache",
            expiration: { maxEntries: 50, maxAgeSeconds: 300 },
            networkTimeoutSeconds: 3,
          },
        },
        {
          urlPattern: /^https:\/\/localhost:8000\/api\/.*/i,
          handler: "CacheFirst",
          options: {
            cacheName: "static-api-cache",
            expiration: { maxEntries: 100, maxAgeSeconds: 3600 },
          },
        },
      ],
    },
    devOptions: { enabled: true, type: "module" },
  })],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: process.env.VITE_API_TARGET || "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    css: false,
    exclude: ["**/node_modules/**", "dist/**", "e2e/**"],
  },
});