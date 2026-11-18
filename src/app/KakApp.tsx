"use client";

import dynamic from "next/dynamic";

// The journal lives entirely in localStorage, so the app is rendered client-side only
// (this wrapper replaces `src/main.tsx` from the original Vite project).
const App = dynamic(() => import("../App"), { ssr: false });

export default function KakApp() {
  return <App />;
}
