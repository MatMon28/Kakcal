// Must stay first: inside the guided tour it swaps localStorage for an in-memory sandbox (demo data never persists).
import "./utils/tourStorage";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// Fonts: latin-only @font-face rules live in index.css (see the note there).
import "./index.css";
import App from "./App";
import faviconUrl from "./assets/brand/kakcalculator-icon.svg";
import { isAndroidApp } from "./utils/android";
import { applyMotionTokens } from "./utils/spring";
import { initPwaInstall } from "./utils/pwaInstall";

// Set at runtime so the single-file build embeds the icon instead of writing a separate file.
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

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
