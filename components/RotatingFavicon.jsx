"use client";
import { useEffect } from "react";

const PALOS = ["espada", "basto", "oro", "copa"];

export default function RotatingFavicon() {
  useEffect(() => {
    let link = document.querySelector("link[rel='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    let i = 0;
    const tick = () => {
      link.href = `/favicon-${PALOS[i]}.png`;
      i = (i + 1) % PALOS.length;
    };
    tick();
    const id = setInterval(tick, 1200);
    return () => clearInterval(id);
  }, []);
  return null;
}
