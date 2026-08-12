/**
 * Post-build untuk `npm run build:lib`.
 *
 * vite-plugin-dts hanya menghasilkan `dist/index.d.mts`, padahal package.json
 * menunjuk ke `dist/index.d.ts` (dipakai TypeScript untuk import & require).
 * Script ini menyalin entry type-nya jadi `index.d.ts` + `index.d.cts`,
 * lalu memastikan `dist/style.css` benar-benar ada.
 */
import { copyFileSync, existsSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(root, "dist");

const entry = resolve(dist, "index.d.mts");
const fallback = `export * from "./lib";\nexport {};\n`;

for (const target of ["index.d.ts", "index.d.cts"]) {
  const to = resolve(dist, target);
  if (existsSync(entry)) copyFileSync(entry, to);
  else writeFileSync(to, fallback, "utf8");
  console.log(`[postbuild] dist/${target} siap`);
}

if (!existsSync(resolve(dist, "style.css"))) {
  console.warn("[postbuild] PERINGATAN: dist/style.css tidak ditemukan.");
} else {
  console.log("[postbuild] dist/style.css siap");
}
