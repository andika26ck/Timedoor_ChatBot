import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import dts from "vite-plugin-dts";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Build NPM PACKAGE: hanya floating chat widget (ChatWidget & teman-temannya).
 *
 *   npm run build:lib
 *
 * Output ke folder `dist/`:
 *   index.mjs / index.cjs  -> kode
 *   index.d.ts             -> types (dibuat oleh scripts/postbuild-types.mjs)
 *   style.css              -> CSS widget (WAJIB di-import oleh pemakai)
 *
 * CSS-nya memakai `tailwind.lib.config.js` (preflight OFF + content dibatasi
 * ke file widget saja) supaya tidak membawa style dashboard dan tidak
 * me-reset style website yang memasang widget ini.
 */
export default defineConfig({
  plugins: [
    react(),
    dts({
      tsconfigPath: "./tsconfig.json",
      entryRoot: "src",
      include: ["src"],
      exclude: [
        "src/main.tsx",
        "src/App.tsx",
        "src/widget.tsx",
        "src/components/DocumentsPanel.tsx",
        "src/components/SettingsPanel.tsx",
        "src/components/TemplatesPanel.tsx",
      ],
      insertTypesEntry: true,
      copyDtsFiles: true,
    }),
  ],
  css: {
    postcss: {
      plugins: [
        tailwindcss({ config: resolve(__dirname, "tailwind.lib.config.js") }),
        autoprefixer(),
      ],
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
    cssCodeSplit: false,
    lib: {
      entry: resolve(__dirname, "src/lib.ts"),
      name: "TimedoorChat",
      formats: ["es", "cjs"],
      fileName: (format) => (format === "es" ? "index.mjs" : "index.cjs"),
    },
    rollupOptions: {
      external: ["react", "react-dom", "react/jsx-runtime"],
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
          "react/jsx-runtime": "jsxRuntime",
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith(".css")) {
            return "style.css";
          }
          return "assets/[name][extname]";
        },
      },
    },
  },
});
