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

    let hasReloaded = false;
    const handleControllerChange = () => {
      if (hasReloaded) return;
      hasReloaded = true;
      window.location.reload();
    };

    const promoteWaitingWorker = (registration: ServiceWorkerRegistration) => {
      registration.waiting?.postMessage({ type: "SKIP_WAITING" });

      registration.installing?.addEventListener("statechange", () => {
        if (registration.installing?.state === "installed") {
          registration.waiting?.postMessage({ type: "SKIP_WAITING" });
        }
      });
    };

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

    void navigator.serviceWorker
      .register(SERVICE_WORKER_URL, {
        scope: "/",
        updateViaCache: "none",
      })
      .then((registration) => {
        promoteWaitingWorker(registration);
        registration.addEventListener("updatefound", () => {
          promoteWaitingWorker(registration);
        });
        return registration.update();
      })
      .catch(() => {
        // Ignore registration failures so the app still renders normally.
      });

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
    };
  }, []);

  return null;
}
