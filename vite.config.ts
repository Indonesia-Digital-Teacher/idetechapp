import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["karaktergame3d.webp"],
      manifest: {
        name: "IdeTech App",
        short_name: "IdeTech",
        description: "Platform Edukasi Terpadu",
        theme_color: "#1690dc",
        background_color: "#1690dc",
        display: "standalone",
        icons: [
          {
            src: "/karaktergame3d.webp",
            sizes: "192x192",
            type: "image/webp",
          },
          {
            src: "/karaktergame3d.webp",
            sizes: "512x512",
            type: "image/webp",
          },
        ],
      },
    }),
  ],
  server: {
    port: 2016,
    proxy: {
      "/api": "http://localhost:2017"
    }
  }
});
