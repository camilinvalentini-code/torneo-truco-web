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
function SectionApilado({ label, count, marks, T, grupos = 3 }) {
  return (
    <div className="flex-1 text-center">
      <div className="text-[10px] uppercase tracking-wide font-bold mb-1.5" style={{ color: T.inkDim }}>
        {label}
      </div>
      <div className="flex gap-2 flex-wrap justify-center">
        {Array.from({ length: grupos }, (_, g) => (
          <Group key={g} value={Math.max(0, Math.min(5, count - g * 5))} marks={marks} T={T} />
        ))}
      </div>
    </div>
  );
}

/* ---- nombre del equipo: texto fijo, o editable si se pide ---- */
function NombreEquipo({ label, editable, onRename, className, style }) {
  if (!editable) {
    return (
      <div className={className} style={style}>
        {label}
      </div>
    );
  }
  return (
    <input
      value={label}
      onChange={(e) => onRename(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      placeholder="Tocá para poner un nombre"
      className={className}
      style={{ ...style, background: "transparent", border: "none", outline: "none", width: "100%" }}
    />
  );
}

/* ---- IMPORTANTE: Team y Col viven acá afuera, a nivel de módulo. Si se
   definieran adentro de LayoutApilado/LayoutVertical, React las trataría
   como un componente "nuevo" en cada letra que se tipea (porque la función
   cambia de referencia en cada render), y eso hace que el navegador tire
   el <input> viejo y ponga uno nuevo — perdiendo el foco a cada tecla. ---- */

function Team({ label, score, onPlus, onMinus, onRename, editableNames, disabled, marks, maxScore, T }) {
  const conCorte = maxScore % 10 === 0; // 20/30/40 se dividen en malas/buenas; 15 no
  const mitad = maxScore / 2;
  const numGrupos = maxScore / 5;
  return (
    <div
      onClick={() => !disabled && onPlus()}
      className="py-4 px-2 rounded-xl transition-colors duration-150"
      style={{ cursor: disabled ? "default" : "pointer" }}
      onMouseDown={(e) => {
        if (!disabled) e.currentTarget.style.background = "rgba(234,194,122,0.12)";
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      <NombreEquipo
        label={label}
        editable={editableNames}
        onRename={onRename}
        className="font-extrabold text-lg mb-2 text-center"
        style={{ color: T.ink }}
      />
      {conCorte ? (
        <div className="flex items-start">
          <SectionApilado label="Malas" count={Math.min(mitad, score)} marks={marks} T={T} grupos={mitad / 5} />
          <div className="w-px self-stretch mx-2" style={{ background: T.line }} />
          <SectionApilado label="Buenas" count={Math.max(0, score - mitad)} marks={marks} T={T} grupos={mitad / 5} />
        </div>
      ) : (
        <div className="flex justify-center gap-2 flex-wrap">
          {Array.from({ length: numGrupos }, (_, g) => (
            <Group key={g} value={Math.max(0, Math.min(5, score - g * 5))} marks={marks} T={T} />
          ))}
        </div>
      )}
      <div className="flex justify-center items-baseline gap-1 mt-2">
        <span className="text-3xl font-black" style={{ color: T.goldBright, fontFamily: "Georgia, serif" }}>
          {score}
        </span>
        <span className="text-xs" style={{ color: T.inkDim }}>
          / {maxScore}
        </span>
      </div>
      <div className="text-center text-[11px] mt-1" style={{ color: T.inkDim }}>
        tocá acá para sumar un tanto
      </div>
      <div className="flex justify-center mt-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMinus();
          }}
          disabled={disabled}
          className="px-8 py-3 rounded-full text-base font-extrabold transition-transform duration-150 active:scale-95 disabled:opacity-40"
          style={{ background: T.panelLight, color: T.redDim, border: `1px solid ${T.line}` }}
        >
          −1 (deshacer)
        </button>
      </div>
    </div>
  );
}

function LayoutApilado({ nameA, nameB, scoreA, scoreB, marks, T, onChange, disabled, maxScore, editableNames, onRenameA, onRenameB }) {
  return (
    <div className="rounded-2xl border shadow-sm px-3" style={{ background: T.panel, borderColor: T.line }}>
      <Team
        label={nameA} score={scoreA} onPlus={() => onChange("A", 1)} onMinus={() => onChange("A", -1)}
        onRename={onRenameA} editableNames={editableNames} disabled={disabled} marks={marks} maxScore={maxScore} T={T}
      />
      <div style={{ borderTop: `2px dashed ${T.line}` }} />
      <Team
        label={nameB} score={scoreB} onPlus={() => onChange("B", 1)} onMinus={() => onChange("B", -1)}
        onRename={onRenameB} editableNames={editableNames} disabled={disabled} marks={marks} maxScore={maxScore} T={T}
      />
    </div>
  );
}

function Col({ label, score, onPlus, onMinus, onRename, editableNames, disabled, marks, maxScore, T }) {
  const numGroups = maxScore / 5;
  const conCorte = maxScore % 10 === 0;
  const grupoDeCorte = maxScore / 10; // después de este grupo va la línea de la mitad
  return (
    <div
      onClick={() => !disabled && onPlus()}
      className="flex-1 text-center py-4 px-1 rounded-xl"
      style={{ cursor: disabled ? "default" : "pointer" }}
    >
      <NombreEquipo
        label={label}
        editable={editableNames}
        onRename={onRename}
        className="font-extrabold text-base mb-3 truncate text-center"
        style={{ color: T.ink }}
      />
      <div className="flex flex-col gap-2 items-center">
        {Array.from({ length: numGroups }, (_, g) => (
          <React.Fragment key={g}>
            {conCorte && g === grupoDeCorte && (
              <div className="w-full flex items-center gap-2 my-1">
                <div style={{ flex: 1, borderTop: `2px solid ${T.gold}` }} />
                <span className="text-[9px] font-bold" style={{ color: T.inkDim }}>{maxScore / 2}</span>
                <div style={{ flex: 1, borderTop: `2px solid ${T.gold}` }} />
              </div>
            )}
            <Group value={Math.max(0, Math.min(5, score - g * 5))} marks={marks} T={T} />
          </React.Fragment>
        ))}
      </div>
      <div className="flex justify-center items-baseline gap-1 mt-3">
        <span className="text-2xl font-black" style={{ color: T.goldBright, fontFamily: "Georgia, serif" }}>
          {score}
        </span>
        <span className="text-xs" style={{ color: T.inkDim }}>
          /{maxScore}
        </span>
      </div>
      <div className="text-[10px] mt-1" style={{ color: T.inkDim }}>
        tocá para sumar
      </div>
      <div className="flex justify-center mt-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMinus();
          }}
          disabled={disabled}
          className="px-6 py-2.5 rounded-full text-sm font-extrabold transition-transform duration-150 active:scale-95 disabled:opacity-40"
          style={{ background: T.panelLight, color: T.redDim, border: `1px solid ${T.line}` }}
        >
          −1
        </button>
      </div>
    </div>
  );
}

function LayoutVertical({ nameA, nameB, scoreA, scoreB, marks, T, onChange, disabled, maxScore, editableNames, onRenameA, onRenameB }) {
  return (
    <div
      className="rounded-2xl border shadow-sm px-3 flex items-start"
      style={{ background: T.panel, borderColor: T.line }}
    >
      <Col
        label={nameA} score={scoreA} onPlus={() => onChange("A", 1)} onMinus={() => onChange("A", -1)}
        onRename={onRenameA} editableNames={editableNames} disabled={disabled} marks={marks} maxScore={maxScore} T={T}
      />
      <div className="w-px self-stretch my-4" style={{ background: T.line }} />
      <Col
        label={nameB} score={scoreB} onPlus={() => onChange("B", 1)} onMinus={() => onChange("B", -1)}
        onRename={onRenameB} editableNames={editableNames} disabled={disabled} marks={marks} maxScore={maxScore} T={T}
      />
    </div>
  );
}

export default function Scoreboard({
  nameA, nameB, scoreA, scoreB, onChange, disabled, layout = "apilado", marks = "palito", maxScore = 30,
  editableNames = false, onRenameA, onRenameB,
}) {
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
      maxScore={maxScore}
      editableNames={editableNames}
      onRenameA={onRenameA}
      onRenameB={onRenameB}
    />
  );
}
