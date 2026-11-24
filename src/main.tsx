import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// Fonts: latin-only @font-face rules live in styles/fonts.css, imported by index.css (see the note there).
import "./index.css";
// Must stay before "./App": paints the launch animation before the app modules are evaluated (see launch-intro.md).
import "./components/intro/earlyStart";
import { afterFirstPaint } from "./components/intro/launchIntro";
import App from "./App";
import faviconUrl from "./assets/brand/kakcalculator-icon.svg";
import { isAndroidApp } from "./utils/android";
import { applyMotionTokens } from "./utils/spring";
import { initPwaInstall } from "./utils/pwaInstall";
import { bootStorage } from "./storage/boot";
import { migrateJournalPhotos } from "./utils/journalStore";
import { whenIdle } from "./utils/idle";

// Set at runtime (the icon is imported as an asset URL).
const favicon = document.createElement("link");
favicon.rel = "icon";
favicon.type = "image/svg+xml";
favicon.href = faviconUrl;
document.head.appendChild(favicon);

// Browser builds cache the app shell for offline reloads. The Android build uses its bundled assets instead.
if (import.meta.env.PROD && import.meta.env.VITE_ANDROID_RELEASE !== "true" &&
    !isAndroidApp() && "serviceWorker" in navigator && window.isSecureContext) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("./offline-worker.js").catch(() => {
      console.warn("Offline browser caching is unavailable.");
    });
  });
}

// Capture the browser's install prompt early so Settings can offer "Install app" later (PWA).
initPwaInstall();

applyMotionTokens();

// The animation is already on screen. Render the app right after its first frame has been painted, so the
// heavy first render can never delay the start of the animation. The journal days are loaded from IndexedDB in
// parallel (see src/storage/boot.ts), so the provider can read them synchronously on its first render.
void Promise.all([afterFirstPaint(), bootStorage()]).then(() => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
  // Legacy base64 photos become IndexedDB blobs once the app is idle.
  whenIdle(() => void migrateJournalPhotos().catch((error) => console.error("Photo migration failed", error)), 10_000);
});
