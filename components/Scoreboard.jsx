"use client";
import React from "react";
import { useTheme } from "../lib/theme";

/* ---- dibujo de un grupo de 5 ---- */
function GroupPalito({ value, T }) {
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
function GroupFosforo({ value, T }) {
  const c = (n) => (value >= n ? T.gold : T.line);
  const head = (n) => (value >= n ? "#E2523F" : T.line);
  return (
    <svg width="38" height="38" viewBox="0 0 24 24">
      <line x1="4" y1="4" x2="20" y2="4" stroke={c(1)} strokeWidth="1.8" strokeLinecap="round" />
      <ellipse cx="20" cy="4" rx="1.7" ry="1.3" fill={head(1)} />
      <line x1="20" y1="4" x2="20" y2="20" stroke={c(2)} strokeWidth="1.8" strokeLinecap="round" />
      <ellipse cx="20" cy="20" rx="1.3" ry="1.7" fill={head(2)} />
      <line x1="20" y1="20" x2="4" y2="20" stroke={c(3)} strokeWidth="1.8" strokeLinecap="round" />
      <ellipse cx="4" cy="20" rx="1.7" ry="1.3" fill={head(3)} />
      <line x1="4" y1="20" x2="4" y2="4" stroke={c(4)} strokeWidth="1.8" strokeLinecap="round" />
      <ellipse cx="4" cy="4" rx="1.3" ry="1.7" fill={head(4)} />
      <line x1="4" y1="20" x2="16" y2="8" stroke={c(5)} strokeWidth="1.8" strokeLinecap="round" />
      <ellipse cx="16" cy="8" rx="1.5" ry="1.5" fill={head(5)} transform="rotate(-45 16 8)" />
    </svg>
  );
}
function Group({ value, marks, T }) {
  return marks === "fosforo" ? <GroupFosforo value={value} T={T} /> : <GroupPalito value={value} T={T} />;
}

/* ---- apilado: malas | buenas lado a lado, dentro de cada equipo ---- */
function SectionApilado({ label, count, marks, T }) {
  return (
    <div className="flex-1 text-center">
      <div className="text-[10px] uppercase tracking-wide font-bold mb-1.5" style={{ color: T.inkDim }}>
        {label}
      </div>
      <div className="flex gap-2 flex-wrap justify-center">
        {[0, 1, 2].map((g) => (
          <Group key={g} value={Math.max(0, Math.min(5, count - g * 5))} marks={marks} T={T} />
        ))}
      </div>
    </div>
  );
}

function LayoutApilado({ nameA, nameB, scoreA, scoreB, marks, T, onChange, disabled }) {
  const Team = ({ label, score, onPlus, onMinus }) => (
    <div className="py-4">
      <div className="font-extrabold text-lg mb-2" style={{ color: T.ink }}>
        {label}
      </div>
      <div className="flex items-start">
        <SectionApilado label="Malas" count={Math.min(15, score)} marks={marks} T={T} />
        <div className="w-px self-stretch mx-2" style={{ background: T.line }} />
        <SectionApilado label="Buenas" count={Math.max(0, score - 15)} marks={marks} T={T} />
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
          disabled={disabled}
          className="flex-1 py-2.5 rounded-xl text-sm font-extrabold transition-transform duration-150 active:scale-95 disabled:opacity-40"
          style={{ background: T.gold, color: T.ink }}
        >
          +1 tanto
        </button>
      </div>
    </div>
  );
  return (
    <div className="rounded-2xl border shadow-sm px-5" style={{ background: T.panel, borderColor: T.line }}>
      <Team label={nameA} score={scoreA} onPlus={() => onChange("A", 1)} onMinus={() => onChange("A", -1)} />
      <div style={{ borderTop: `2px dashed ${T.line}` }} />
      <Team label={nameB} score={scoreB} onPlus={() => onChange("B", 1)} onMinus={() => onChange("B", -1)} />
    </div>
  );
}

/* ---- vertical: equipo A | equipo B lado a lado, sin separar malas/buenas ---- */
function LayoutVertical({ nameA, nameB, scoreA, scoreB, marks, T, onChange, disabled }) {
  const Col = ({ label, score, onPlus, onMinus }) => (
    <div className="flex-1 text-center py-4">
      <div className="font-extrabold text-base mb-3 truncate" style={{ color: T.ink }}>
        {label}
      </div>
      <div className="flex flex-col gap-2 items-center">
        {[0, 1, 2, 3, 4, 5].map((g) => (
          <Group key={g} value={Math.max(0, Math.min(5, score - g * 5))} marks={marks} T={T} />
        ))}
      </div>
      <div className="flex justify-center items-baseline gap-1 mt-3">
        <span className="text-2xl font-black" style={{ color: T.goldBright, fontFamily: "Georgia, serif" }}>
          {score}
        </span>
        <span className="text-xs" style={{ color: T.inkDim }}>
          /30
        </span>
      </div>
      <div className="flex flex-col gap-2 mt-3">
        <button
          onClick={onPlus}
          disabled={disabled}
          className="py-2 rounded-xl text-sm font-extrabold transition-transform duration-150 active:scale-95 disabled:opacity-40"
          style={{ background: T.gold, color: T.ink }}
        >
          +1
        </button>
        <button
          onClick={onMinus}
          disabled={disabled}
          className="py-1.5 rounded-xl text-xs font-extrabold transition-transform duration-150 active:scale-95 disabled:opacity-40"
          style={{ background: T.panelLight, color: T.redDim, border: `1px solid ${T.line}` }}
        >
          −1
        </button>
      </div>
    </div>
  );
  return (
    <div
      className="rounded-2xl border shadow-sm px-3 flex items-start"
      style={{ background: T.panel, borderColor: T.line }}
    >
      <Col label={nameA} score={scoreA} onPlus={() => onChange("A", 1)} onMinus={() => onChange("A", -1)} />
      <div className="w-px self-stretch my-4" style={{ background: T.line }} />
      <Col label={nameB} score={scoreB} onPlus={() => onChange("B", 1)} onMinus={() => onChange("B", -1)} />
    </div>
  );
}

export default function Scoreboard({ nameA, nameB, scoreA, scoreB, onChange, disabled, layout = "apilado", marks = "palito" }) {
  const { T } = useTheme();
  const Layout = layout === "vertical" ? LayoutVertical : LayoutApilado;
  return (
    <Layout
      nameA={nameA}
      nameB={nameB}
      scoreA={scoreA}
      scoreB={scoreB}
      marks={marks}
      T={T}
      onChange={onChange}
      disabled={disabled}
    />
  );
}
