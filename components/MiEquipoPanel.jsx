"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useTheme } from "../lib/theme";
import { supabase } from "../lib/supabaseClient";
import { fraseCampeonAlAzar } from "../lib/champFrases";

function claveStorage(tournamentId) {
  return `torneotruco:mi-equipo:${tournamentId}`;
}

// Busca, entre todos los partidos donde juega mi equipo, el más
// relevante para mostrar ahora: el de la ronda más avanzada, y si hay
// más de uno en la misma ronda (puede pasar en el Sistema Vidon Bar, si
// perdiste y te volvieron a colocar en otro lugar), el que todavía no
// esté decidido.
function partidoActual(miEquipoId, matches) {
  const mios = matches.filter((m) => m.team1_id === miEquipoId || m.team2_id === miEquipoId);
  if (mios.length === 0) return null;
  mios.sort((a, b) => {
    if (b.round_index !== a.round_index) return b.round_index - a.round_index;
    const aDecidido = a.winner_id ? 1 : 0;
    const bDecidido = b.winner_id ? 1 : 0;
    return aDecidido - bDecidido;
  });
  return mios[0];
}

export default function MiEquipoPanel({ tournament, teams, matches, teamsById }) {
  const { T } = useTheme();
  const [miEquipoId, setMiEquipoId] = useState(undefined); // undefined = todavía no leyó localStorage
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    try {
      const guardado = window.localStorage.getItem(claveStorage(tournament.id));
      setMiEquipoId(guardado || null);
    } catch (e) {
      setMiEquipoId(null);
    }
  }, [tournament.id]);

  function elegirEquipo(teamId) {
    try {
      window.localStorage.setItem(claveStorage(tournament.id), teamId);
    } catch (e) {}
    setMiEquipoId(teamId);
  }

  if (miEquipoId === undefined) return null; // evita el parpadeo mientras carga

  if (miEquipoId === null) {
    const filtrados = teams.filter((t) => t.name.toLowerCase().includes(busqueda.toLowerCase()));
    return (
      <div className="rounded-2xl p-4 mb-5 border shadow-sm" style={{ background: T.panel, borderColor: T.line }}>
        <h2 className="font-bold text-center mb-1" style={{ color: T.gold }}>
          ¿Cuál es tu equipo?
        </h2>
        <p className="text-xs text-center mb-3" style={{ color: T.inkDim }}>
          Elegilo una vez — este celular se va a acordar el resto del torneo, y te va a mostrar directo tu propio
          partido en cada ronda.
        </p>
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscá tu equipo..."
          className="w-full px-3 py-2 rounded-xl text-sm mb-2"
          style={{ background: T.bg, color: T.ink, border: `1px solid ${T.line}` }}
        />
        <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
          {filtrados.map((t) => (
            <button
              key={t.id}
              onClick={() => elegirEquipo(t.id)}
              className="text-left px-3 py-2 rounded-xl text-sm font-semibold transition-colors duration-150"
              style={{ background: T.panelLight, color: T.ink }}
            >
              {t.name}
            </button>
          ))}
          {filtrados.length === 0 && (
            <p className="text-xs text-center py-2" style={{ color: T.inkDim }}>
              No encontramos ningún equipo con ese nombre.
            </p>
          )}
        </div>
      </div>
    );
  }

  const miEquipo = teamsById[miEquipoId];
  if (!miEquipo) return null; // el equipo guardado ya no existe en este torneo (raro, pero por las dudas)

  // Campeón
  if (tournament.champion_id === miEquipoId) {
    return (
      <div
        className="rounded-3xl p-5 mb-5 text-center border-2 shadow-md"
        style={{ background: "#FBF3E3", borderColor: "#EAC27A" }}
      >
        <div className="text-xs font-bold uppercase tracking-widest" style={{ color: "#B85C55" }}>
          🏆 ¡Sos el campeón!
        </div>
        <div className="text-2xl font-black mt-1" style={{ color: "#33453E" }}>
          {miEquipo.name}
        </div>
        <div className="text-xs mt-1 italic" style={{ color: "#B85C55" }}>
          {fraseCampeonAlAzar()}
        </div>
      </div>
    );
  }

  const actual = partidoActual(miEquipoId, matches);

  if (!actual) {
    return (
      <div className="rounded-2xl p-4 mb-5 border shadow-sm text-center" style={{ background: T.panel, borderColor: T.line }}>
        <p className="text-sm" style={{ color: T.ink }}>
          Hola, <b>{miEquipo.name}</b> 👋
        </p>
        <p className="text-xs mt-1" style={{ color: T.inkDim }}>
          Todavía no se hizo el sorteo. Apenas se arme el cuadro, acá vas a ver tu primer partido.
        </p>
      </div>
    );
  }

  const gane = actual.winner_id === miEquipoId;
  const perdi = actual.winner_id && actual.winner_id !== miEquipoId;

  if (perdi) {
    return (
      <div className="rounded-2xl p-4 mb-5 border shadow-sm text-center" style={{ background: T.panel, borderColor: T.line }}>
        <p className="text-sm font-bold" style={{ color: T.ink }}>
          {miEquipo.name}, quedaste afuera esta vez.
        </p>
        <p className="text-xs mt-1" style={{ color: T.inkDim }}>
          Gracias por jugar — podés seguir mirando el cuadro completo, más abajo.
        </p>
      </div>
    );
  }

  const rivalId = actual.team1_id === miEquipoId ? actual.team2_id : actual.team1_id;
  const rival = rivalId ? teamsById[rivalId] : null;

  if (!rival) {
    return (
      <div className="rounded-2xl p-4 mb-5 border shadow-sm text-center" style={{ background: T.panel, borderColor: T.line }}>
        <p className="text-sm font-bold" style={{ color: T.ink }}>
          🎉 {gane ? "¡Ganaste! " : ""}
          {miEquipo.name}, avanzaste de ronda.
        </p>
        <p className="text-xs mt-1" style={{ color: T.inkDim }}>
          Esperando que se defina tu próximo rival...
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl p-4 mb-5 border shadow-sm text-center" style={{ background: T.panel, borderColor: T.line }}>
      <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: T.gold }}>
        Tu partido ahora
      </p>
      <p className="text-lg font-black" style={{ color: T.ink }}>
        {miEquipo.name} <span style={{ color: T.inkDim, fontWeight: 400 }}>vs</span> {rival.name}
      </p>
      <BotonAnotar matchId={actual.id} />
    </div>
  );
}

// Pide el token de ESTE partido puntual, aparte de la consulta general —
// así la página pública nunca trae de una los tokens de todos los
// partidos juntos, solo el tuyo, cuando hace falta.
function BotonAnotar({ matchId }) {
  const { T } = useTheme();
  const [token, setToken] = useState(null);

  useEffect(() => {
    let activo = true;
    supabase
      .from("matches")
      .select("match_token")
      .eq("id", matchId)
      .single()
      .then(({ data }) => {
        if (activo) setToken(data?.match_token || null);
      });
    return () => {
      activo = false;
    };
  }, [matchId]);

  if (!token) return null;

  return (
    <Link
      href={`/partido/${token}`}
      className="inline-block mt-3 px-6 py-2.5 rounded-2xl font-bold text-sm transition-all duration-200 hover:scale-105 active:scale-95"
      style={{ background: T.gold, color: T.ink }}
    >
      Anotar este partido
    </Link>
  );
}
