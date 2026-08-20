// Build widget embed + salin hasilnya ke dist/widget.js.
// Bersifat best-effort: kalau build widget gagal, script ini TIDAK menggagalkan
// build utama, sehingga situs admin tetap ter-deploy. Cek /widget.js sesudah deploy.
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync } from "node:fs";

try {
  execFileSync(
    process.execPath,
    ["node_modules/vite/bin/vite.js", "build", "--config", "vite.widget.config.ts"],
    { stdio: "inherit" },
  );
  const src = "dist-widget/widget.js";
  if (!existsSync(src)) throw new Error(src + " tidak ditemukan setelah build");
  if (!existsSync("dist")) mkdirSync("dist", { recursive: true });
  copyFileSync(src, "dist/widget.js");
  console.log("[build-widget] OK -> dist/widget.js");
} catch (err) {
  const msg = err && err.message ? err.message : String(err);
  console.warn("[build-widget] DILEWATI:", msg);
  console.warn("[build-widget] Situs admin tetap ter-deploy; cek /widget.js sesudah deploy.");
}
