"use client";

import { useEffect } from "react";

const SERVICE_WORKER_URL = "/sw.js";

export function PwaRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !window.isSecureContext) {
      return;
    }

    if (process.env.NODE_ENV !== "production") {
      void navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          void registration.unregister();
        });
      });
      return;
    }

    void navigator.serviceWorker
      .register(SERVICE_WORKER_URL, {
        scope: "/",
        updateViaCache: "none",
      })
      .then((registration) => registration.update())
      .catch(() => {
        // Ignore registration failures so the app still renders normally.
      });
  }, []);

  return null;
}
