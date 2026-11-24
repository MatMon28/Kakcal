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

// The animation is already on screen. Render the app right after its first frame has been painted, so the
// heavy first render can never delay the start of the animation.
void afterFirstPaint().then(() => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
});
