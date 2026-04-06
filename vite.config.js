import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: ["logo-no-bg-white.png"],
      workbox: {
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 4000000,
        globPatterns: ["**/*.{js,css,html,ico,png,svg,json}"],
      },
      devOptions: {
        enabled: true,
        type: "module",
      },
      // ----------------------
      manifest: {
        start_url: "/",
        scope: "/",
        display: "standalone",
        name: "Discotive OS",
        short_name: "Discotive",
        description: "The ultimate career engine and execution protocol.",
        theme_color: "#030303",
        background_color: "#030303",
        orientation: "portrait",
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
        screenshots: [
          {
            src: "/screenshot-desktop.png",
            sizes: "1920x1080",
            type: "image/png",
            form_factor: "wide",
          },
          {
            src: "/screenshot-mobile.png",
            sizes: "1080x1920",
            type: "image/png",
          },
        ],
      },
    }),
  ],
});
