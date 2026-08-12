import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

/**
 * Konfigurasi build khusus WIDGET EMBEDDABLE.
 *
 *   npm run build:widget
 *
 * Menghasilkan dist-widget/widget.js (format IIFE, satu file, React ikut
 * di-bundle) yang bisa ditempel di website mana pun lewat <script>.
 * CSS di-inline ke dalam JS (via import "./index.css?inline") dan dirender
 * di Shadow DOM, jadi tidak ada file CSS terpisah yang perlu dimuat.
 */
export default defineConfig({
  plugins: [react()],
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  build: {
    outDir: "dist-widget",
    emptyOutDir: true,
    lib: {
      entry: resolve(__dirname, "src/widget.tsx"),
      name: "TimedoorChatbot",
      formats: ["iife"],
      fileName: () => "widget.js",
    },
    rollupOptions: {
      output: {
        // Bundle semua dependency (termasuk React) ke satu file.
        inlineDynamicImports: true,
      },
    },
  },
});
