import fs from "fs";
import path from "path";
import { createHash } from "crypto";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";
import { defineConfig } from "vitest/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const walk = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });

/**
 * Stamps `dist/offline-worker.js` after the build (docs/pwa.md): `__BUILD_ID__` becomes a hash of the shell and every
 * emitted asset, and `__PRECACHE_ASSETS__` becomes the list of emitted `assets/*` files, so the worker's cache version
 * always matches the files it precaches. The Android build has no public dir (no worker), so it is skipped there.
 */
function stampOfflineWorker(): Plugin {
  let outDir = "dist";
  return {
    name: "kakcal-stamp-offline-worker",
    apply: "build",
    enforce: "post",
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const worker = path.join(outDir, "offline-worker.js");
      if (!fs.existsSync(worker)) return;
      const assetsDir = path.join(outDir, "assets");
      const assets = fs.existsSync(assetsDir)
        ? walk(assetsDir).map((file) => path.relative(outDir, file).split(path.sep).join("/")).filter((file) => !file.endsWith(".map")).sort()
        : [];
      const hash = createHash("sha1");
      hash.update(fs.readFileSync(path.join(outDir, "index.html")));
      assets.forEach((file) => hash.update(file));
      const buildId = `${Date.now().toString(36)}-${hash.digest("hex").slice(0, 8)}`;
      const source = fs.readFileSync(worker, "utf8");
      if (!source.includes("__BUILD_ID__") || !source.includes("__PRECACHE_ASSETS__")) {
        throw new Error("offline-worker.js lost its __BUILD_ID__ / __PRECACHE_ASSETS__ placeholders.");
      }
      fs.writeFileSync(worker, source.replace("__BUILD_ID__", buildId).replace("[/*__PRECACHE_ASSETS__*/]", JSON.stringify(assets)));
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  // Relative URLs: the same build works from a sub-path (GitHub Pages), the site root and Capacitor's local origin.
  base: "./",
  plugins: [react(), tailwindcss(), stampOfflineWorker()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.{ts,tsx}"],
    setupFiles: ["tests/setup.ts"],
  },
});
