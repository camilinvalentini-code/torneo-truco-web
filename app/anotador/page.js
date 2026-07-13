"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useTheme } from "../../lib/theme";
import { useSkin } from "../../lib/scoreboardSkin";
import { fraseCampeonAlAzar } from "../../lib/champFrases";
import ThemeToggleButton from "../../components/ThemeToggleButton";
import SuitIcon from "../../components/SuitIcon";
import Scoreboard from "../../components/Scoreboard";

const CLAVE = "torneotruco:anotador-libre";

export default function AnotadorLibre() {
  const { T } = useTheme();
  const { layout, marks, setLayout, setMarks } = useSkin();
  const [nameA, setNameA] = useState("Equipo A");
  const [nameB, setNameB] = useState("Equipo B");
  const [puntosMax, setPuntosMax] = useState(30);
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [frase, setFrase] = useState("");
  const [cargado, setCargado] = useState(false);
  const [mostrarAjustes, setMostrarAjustes] = useState(false);

  useEffect(() => {
    try {
      const guardado = window.localStorage.getItem(CLAVE);
      if (guardado) {
        const d = JSON.parse(guardado);
        setNameA(d.nameA || "Equipo A");
        setNameB(d.nameB || "Equipo B");
        setPuntosMax(d.puntosMax || 30);
        setScoreA(d.scoreA || 0);
        setScoreB(d.scoreB || 0);
      }
    } catch (e) {}
    setCargado(true);
  }, []);

  useEffect(() => {
    if (!cargado) return;
    try {
      window.localStorage.setItem(CLAVE, JSON.stringify({ nameA, nameB, puntosMax, scoreA, scoreB }));
    } catch (e) {}
  }, [cargado, nameA, nameB, puntosMax, scoreA, scoreB]);

  function onChange(side, delta) {
    if (side === "A") setScoreA((s) => Math.max(0, Math.min(puntosMax, s + delta)));
    else setScoreB((s) => Math.max(0, Math.min(puntosMax, s + delta)));
  }

  function reiniciar() {
    setScoreA(0);
    setScoreB(0);
    setFrase("");
  }

  const ganador = scoreA >= puntosMax ? nameA : scoreB >= puntosMax ? nameB : null;

  useEffect(() => {
    if (ganador && !frase) setFrase(fraseCampeonAlAzar());
  }, [ganador]);

  if (!cargado) return null;

  return (
    <div className="min-h-screen transition-colors duration-500" style={{ background: T.bg }}>
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="flex justify-between mb-4">
          <Link href="/" className="text-xs underline" style={{ color: T.inkDim }}>
            ← Inicio
          </Link>
          <div className="flex gap-2 items-center">
            <button
              onClick={() => setMostrarAjustes((v) => !v)}
              className="text-xs underline"
              style={{ color: T.inkDim }}
            >
              {mostrarAjustes ? "ocultar diseño" : "diseño"}
            </button>
            <ThemeToggleButton />
          </div>
        </div>

        <div className="flex justify-center mb-2">
          <SuitIcon suit="oro" size={22} />
        </div>
        <h1 className="text-2xl font-black text-center mb-1" style={{ color: T.ink, fontFamily: "Georgia, serif" }}>
          Anotador
        </h1>
        <p className="text-center text-xs mb-5" style={{ color: T.inkDim }}>
          Tocá el nombre para cambiarlo. Se guarda solo en este celular.
        </p>

        {mostrarAjustes && (
          <div className="rounded-2xl p-3 mb-4 border" style={{ background: T.panel, borderColor: T.line }}>
            <div className="flex gap-2 mb-2">
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
                    {m === "palito" ? "Palitos" : "Fósforos"}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: T.gold }}>
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
          </div>
        )}

        <Scoreboard
          nameA={nameA}
          nameB={nameB}
          scoreA={scoreA}
          scoreB={scoreB}
          layout={layout}
          marks={marks}
          maxScore={puntosMax}
          onChange={onChange}
          disabled={!!ganador}
          editableNames
          onRenameA={setNameA}
          onRenameB={setNameB}
        />

        {ganador && (
          <div
            className="rounded-3xl p-5 mt-5 text-center border-2 shadow-md"
            style={{ background: "#FBF3E3", borderColor: "#EAC27A" }}
          >
            <div className="text-xs font-bold uppercase tracking-widest" style={{ color: "#B85C55" }}>
              Ganó
            </div>
            <div className="text-2xl font-black mt-1" style={{ color: "#33453E" }}>
              {ganador}
            </div>
            <div className="text-xs mt-1 italic" style={{ color: "#B85C55" }}>
              {frase}
            </div>
          </div>
        )}

        <button
          onClick={reiniciar}
          className="w-full mt-4 py-2.5 rounded-xl font-bold text-sm"
          style={{ background: T.panelLight, color: T.ink, border: `1px solid ${T.line}` }}
        >
          🔄 Reiniciar marcador
        </button>
      </div>
    </div>
  );
}
