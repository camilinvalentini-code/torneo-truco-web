"use client";
import React from "react";
import { useTheme } from "../lib/theme";

export default function SiteFooter() {
  const { T } = useTheme();
  return (
    <footer className="max-w-3xl mx-auto px-4 pb-10 pt-6 text-center" style={{ background: T.bg }}>
      <a
        href="https://instagram.com/truco.cordoba"
        target="_blank"
        rel="noreferrer"
        className="block text-sm font-semibold mb-2"
        style={{ color: T.inkDim }}
      >
        📸 @truco.cordoba
      </a>
      <p className="text-xs" style={{ color: T.inkDim }}>
        Si te sirvió, una colaboración se agradece — alias{" "}
        <span className="font-bold" style={{ color: T.goldBright }}>
          Envidito
        </span>
      </p>
    </footer>
  );
}
