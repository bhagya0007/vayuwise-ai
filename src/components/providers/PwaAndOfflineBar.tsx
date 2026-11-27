"use client";

import { useEffect, useSyncExternalStore } from "react";
import { WifiOff } from "lucide-react";
import type { Locale } from "@/types/domain";

function subscribeOnlineStatus(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

function getOnlineSnapshot() {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

export function PwaAndOfflineBar({ locale }: { locale: Locale }) {
  const isOnline = useSyncExternalStore(
    subscribeOnlineStatus,
    getOnlineSnapshot,
    () => true
  );

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      window.location.hostname !== "127.0.0.1"
    ) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // graceful non-blocking registration
      });
    }
  }, []);

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="print:hidden sticky top-0 z-50 flex items-center justify-center gap-2 border-b border-amber-500/40 bg-amber-500/15 px-4 py-2 text-xs font-medium text-amber-950 backdrop-blur-sm dark:text-amber-200"
    >
      <WifiOff className="size-3.5 shrink-0" aria-hidden="true" />
      <span>
        {locale === "hi"
          ? "आप ऑफ़लाइन हैं — लाइव Open-Meteo और Gemini AI अपडेट रुके हुए हैं। पहले देखे गए मान पुराने (stale) हो सकते हैं।"
          : "You are offline — live Open-Meteo readings and Gemini AI are paused. Previously viewed air quality values should be treated as stale."}
      </span>
    </div>
  );
}
