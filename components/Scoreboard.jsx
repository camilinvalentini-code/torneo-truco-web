"use client";
import React from "react";
import { useTheme } from "../lib/theme";

function StrokeGroup({ value, T }) {
  const c = (n) => (value >= n ? T.ink : T.line);
  const w = (n) => (value >= n ? 3.2 : 1.8);
  return (
    <svg width="38" height="38" viewBox="0 0 20 20">
      <line x1="2" y1="2" x2="18" y2="2" stroke={c(1)} strokeWidth={w(1)} strokeLinecap="round" />
      <line x1="18" y1="2" x2="18" y2="18" stroke={c(2)} strokeWidth={w(2)} strokeLinecap="round" />
      <line x1="18" y1="18" x2="2" y2="18" stroke={c(3)} strokeWidth={w(3)} strokeLinecap="round" />
      <line x1="2" y1="18" x2="2" y2="2" stroke={c(4)} strokeWidth={w(4)} strokeLinecap="round" />
      <line x1="2" y1="2" x2="18" y2="18" stroke={c(5)} strokeWidth={w(5)} strokeLinecap="round" />
    </svg>
  );
}

function Section({ label, count, T }) {
  return (
    <div className="flex-1 text-center">
      <div
        className="text-[10px] uppercase tracking-wide font-bold mb-1.5"
        style={{ color: T.inkDim }}
      >
        {label}
      </div>
      <div className="flex gap-2 flex-wrap justify-center">
        {[0, 1, 2].map((g) => (
          <StrokeGroup key={g} value={Math.max(0, Math.min(5, count - g * 5))} T={T} />
        ))}
      </div>
    </div>
  );
}

export default function Scoreboard({ nameA, nameB, scoreA, scoreB, onChange, disabled }) {
  const { T } = useTheme();
  const winner = scoreA >= 30 ? "A" : scoreB >= 30 ? "B" : null;

  const Team = ({ label, score, onPlus, onMinus }) => (
    <div className="py-4">
      <div className="font-extrabold text-lg mb-2" style={{ color: T.ink }}>
        {label}
      </div>
      <div className="flex items-start">
        <Section label="Malas" count={Math.min(15, score)} T={T} />
        <div className="w-px self-stretch mx-2" style={{ background: T.line }} />
        <Section label="Buenas" count={Math.max(0, score - 15)} T={T} />
      </div>
      <div className="flex justify-center items-baseline gap-1 mt-2">
        <span className="text-3xl font-black" style={{ color: T.goldBright, fontFamily: "Georgia, serif" }}>
          {score}
        </span>
        <span className="text-xs" style={{ color: T.inkDim }}>
          / 30
        </span>
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={onMinus}
          disabled={disabled}
          className="flex-1 py-2.5 rounded-xl text-sm font-extrabold transition-transform duration-150 active:scale-95 disabled:opacity-40"
          style={{ background: T.panelLight, color: T.redDim, border: `1px solid ${T.line}` }}
        >
          −1
        </button>
        <button
          onClick={onPlus}
          disabled={disabled || !!winner}
          className="flex-1 py-2.5 rounded-xl text-sm font-extrabold transition-transform duration-150 active:scale-95 disabled:opacity-40"
          style={{ background: T.gold, color: T.ink }}
        >
          +1 tanto
        </button>
      </div>
    </div>
  );

  return (
    <div>
      <div
        className="rounded-2xl border shadow-sm px-5"
        style={{ background: T.panel, borderColor: T.line }}
      >
        <Team label={nameA} score={scoreA} onPlus={() => onChange("A", 1)} onMinus={() => onChange("A", -1)} />
        <div className="h-0.5" style={{ borderTop: `2px dashed ${T.line}` }} />
        <Team label={nameB} score={scoreB} onPlus={() => onChange("B", 1)} onMinus={() => onChange("B", -1)} />
      </div>
    </div>
  );
}
