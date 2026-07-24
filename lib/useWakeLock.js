"use client";
import { useEffect, useRef } from "react";

// Mantiene la pantalla encendida mientras el componente que lo usa está
// montado. Funciona en la mayoría de los celulares modernos (Android
// Chrome, iPhone con iOS 16.4 o más nuevo). En los que no lo soportan,
// simplemente no hace nada — no rompe nada, solo no ayuda ahí.
export function useWakeLock() {
  const lockRef = useRef(null);

  useEffect(() => {
    let activo = true;

    async function pedirLock() {
      if (!("wakeLock" in navigator)) return;
      try {
        const lock = await navigator.wakeLock.request("screen");
        lockRef.current = lock;
        // El sistema puede soltar el lock por su cuenta (batería, algún
        // timing raro) sin que la pestaña llegue a marcarse "oculta" —
        // por eso escuchamos directamente el aviso del propio lock, no
        // solo el cambio de pestaña.
        lock.addEventListener("release", () => {
          if (lockRef.current === lock) lockRef.current = null;
        });
      } catch (e) {
        /* el navegador lo rechazó (poca batería, pestaña no visible, etc.) */
      }
    }

    async function alVolverVisible() {
      if (activo && document.visibilityState === "visible" && !lockRef.current) {
        await pedirLock();
      }
    }

    pedirLock();
    document.addEventListener("visibilitychange", alVolverVisible);
    window.addEventListener("focus", alVolverVisible);

    return () => {
      activo = false;
      document.removeEventListener("visibilitychange", alVolverVisible);
      window.removeEventListener("focus", alVolverVisible);
      if (lockRef.current) {
        lockRef.current.release().catch(() => {});
        lockRef.current = null;
      }
    };
  }, []);
}
