"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }
    navigator.serviceWorker
      .register("/service-worker.js")
      .catch((error: unknown) => {
        console.error("Échec de l’activation du service worker PWA.", error);
      });
  }, []);

  return null;
}
