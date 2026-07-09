"use client";
import React from "react";
import { useTheme } from "../lib/theme";

export const SUITS = ["espada", "basto", "oro", "copa"];

export default function SuitIcon({ suit, size = 16, color }) {
  const { T } = useTheme();
  const c = color || T.gold;
  const s = size;
  if (suit === "oro")
    return (
      <svg width={s} height={s} viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="7.5" stroke={c} strokeWidth="1.6" />
        <circle cx="10" cy="10" r="3.2" stroke={c} strokeWidth="1.3" />
      </svg>
    );
  if (suit === "copa")
    return (
      <svg width={s} height={s} viewBox="0 0 20 20" fill="none">
        <path
          d="M4 3H16L13.2 10.5C12.5 12.3 11 13 10 13C9 13 7.5 12.3 6.8 10.5L4 3Z"
          stroke={c}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <line x1="10" y1="13" x2="10" y2="16.5" stroke={c} strokeWidth="1.5" />
        <line x1="6.5" y1="17.5" x2="13.5" y2="17.5" stroke={c} strokeWidth="1.5" />
      </svg>
    );
  if (suit === "espada")
    return (
      <svg width={s} height={s} viewBox="0 0 20 20" fill="none">
        <line x1="10" y1="2" x2="10" y2="14" stroke={c} strokeWidth="1.6" />
        <line x1="5.5" y1="6" x2="14.5" y2="6" stroke={c} strokeWidth="1.6" />
        <path d="M8 14H12L10 18L8 14Z" fill={c} />
      </svg>
    );
  return (
    <svg width={s} height={s} viewBox="0 0 20 20" fill="none">
      <line x1="5" y1="16" x2="15" y2="4" stroke={c} strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="6" cy="15" r="2.1" fill={c} />
      <circle cx="14" cy="5" r="2.1" fill={c} />
    </svg>
  );
}
