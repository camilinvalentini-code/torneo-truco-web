"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useTheme } from "../../lib/theme";
import { useSkin } from "../../lib/scoreboardSkin";
import { fraseCampeonAlAzar } from "../../lib/champFrases";
import ThemeToggleButton from "../../components/ThemeToggleButton";
import SuitIcon from "../../components/SuitIcon";
import Scoreboard from "../../components/Scoreboard";

export default function AnotadorLibre() {
  const { T } = useTheme();
  const { layout, marks, setLayout, setMarks } = useSkin();
  const [nameA, setNameA] = useState("");
  const [nameB, setNameB] = useState("");
  const [puntosMax, setPuntosMax] = useState(30);
  const [empezado, setEmpezado] = useState(false);
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [frase] = useState(() => fraseCampeonAlAzar());

  function empezar() {
    setEmpezado(true);
  }

  function onChange(side, delta) {
    if (side === "A") setScoreA((s) => Math.max(0, Math.min(puntosMax, s + delta)));
    else setScoreB((s) => Math.max(0, Math.min(puntosMax, s + delta)));
  }

  function jugarDeNuevo() {
    setScoreA(0);
    setScoreB(0);
  }

  function otroPartido() {
    setEmpezado(false);
    setScoreA(0);
    setScoreB(0);
    setNameA("");
    setNameB("");
  }

  const ganador = scoreA >= puntosMax ? nameA || "Equipo A" : scoreB >= puntosMax ? nameB || "Equipo B" : null;

  return (
    <div className="min-h-screen transition-colors duration-500" style={{ background: T.bg }}>
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="flex justify-between mb-4">
          <Link href="/" className="text-xs underline" style={{ color: T.inkDim }}>
            ← Inicio
          </Link>
          <ThemeToggleButton />
        </div>

        <div className="flex justify-center mb-2">
          <SuitIcon suit="oro" size={22} />
        </div>
        <h1 className="text-2xl font-black text-center mb-1" style={{ color: T.ink, fontFamily: "Georgia, serif" }}>
          Anotador
        </h1>
        <p className="text-center text-sm mb-6" style={{ color: T.inkDim }}>
          Para anotar un partido suelto, sin armar un torneo. Queda solo en tu celular.
        </p>

        {!empezado ? (
          <div className="rounded-2xl p-4 border shadow-sm" style={{ background: T.panel, borderColor: T.line }}>
            <div className="flex flex-col gap-2">
              <input
                value={nameA}
                onChange={(e) => setNameA(e.target.value)}
                placeholder="Nombre del lado A (opcional)"
                className="px-3 py-2 rounded-xl text-sm"
                style={{ background: T.bg, color: T.ink, border: `1px solid ${T.line}` }}
              />
              <input
                value={nameB}
                onChange={(e) => setNameB(e.target.value)}
                placeholder="Nombre del lado B (opcional)"
                className="px-3 py-2 rounded-xl text-sm"
                style={{ background: T.bg, color: T.ink, border: `1px solid ${T.line}` }}
              />

              <div className="flex gap-2 mt-1">
                <div className="flex rounded-xl overflow-hidden border flex-1" style={{ borderColor: T.gold }}>
                  {["apilado", "vertical"].map((l) => (
                    <button
                      key={l}
                      onClick={() => setLayout(l)}
                      className="flex-1 py-1.5 text-xs font-bold capitalize"
                      style={{ background: layout === l ? T.gold : "transparent", color: layout === l ? T.ink : T.inkDim }}
                    >
                      {l}
                    </button>
                  ))}
                </div>
                <div className="flex rounded-xl overflow-hidden border flex-1" style={{ borderColor: T.gold }}>
                  {["palito", "fosforo"].map((m) => (
                    <button
                      key={m}
                      onClick={() => setMarks(m)}
                      className="flex-1 py-1.5 text-xs font-bold capitalize"
                      style={{ background: marks === m ? T.gold : "transparent", color: marks === m ? T.ink : T.inkDim }}
                    >
                      {m === "palito" ? "Palitos" : "Fosforos"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex rounded-xl overflow-hidden border mt-1" style={{ borderColor: T.gold }}>
                {[30, 15].map((p) => (
                  <button
                    key={p}
                    onClick={() => setPuntosMax(p)}
                    className="flex-1 py-1.5 text-xs font-bold"
                    style={{ background: puntosMax === p ? T.gold : "transparent", color: puntosMax === p ? T.ink : T.inkDim }}
                  >
                    {p} puntos
                  </button>
                ))}
              </div>

              <button
                onClick={empezar}
                className="py-2.5 rounded-xl font-bold text-sm mt-1 transition-all duration-200 hover:scale-105 active:scale-95"
                style={{ background: T.gold, color: T.ink }}
              >
                Empezar a anotar
              </button>
            </div>
          </div>
        ) : (
          <>
            <Scoreboard
              nameA={nameA || "Equipo A"}
              nameB={nameB || "Equipo B"}
              scoreA={scoreA}
              scoreB={scoreB}
              layout={layout}
              marks={marks}
              maxScore={puntosMax}
              onChange={onChange}
              disabled={!!ganador}
            />

            {ganador && (
              <div
                className="rounded-3xl p-5 mt-5 text-center border-2 shadow-md"
                style={{ background: "#FBF3E3", borderColor: "#EAC27A" }}
              >
                <div className="text-xs font-bold uppercase tracking-widest" style={{ color: "#B85C55" }}>
                  Gano
                </div>
                <div className="text-2xl font-black mt-1" style={{ color: "#33453E" }}>
                  {ganador}
                </div>
                <div className="text-xs mt-1 italic" style={{ color: "#B85C55" }}>
                  {frase}
                </div>
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <button
                onClick={jugarDeNuevo}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm"
                style={{ background: T.panelLight, color: T.ink, border: `1px solid ${T.line}` }}
              >
                Reiniciar el marcador
              </button>
              <button
                onClick={otroPartido}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm"
                style={{ background: T.panelLight, color: T.inkDim, border: `1px solid ${T.line}` }}
              >
                Otro partido
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
