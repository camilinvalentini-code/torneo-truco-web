"use client";
import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useTheme } from "../../../lib/theme";
import { supabase } from "../../../lib/supabaseClient";
import { fraseCampeonAlAzar } from "../../../lib/champFrases";
import BracketDisplay from "../../../components/BracketDisplay";
import ThemeToggleButton from "../../../components/ThemeToggleButton";
import SuitIcon from "../../../components/SuitIcon";
import MiEquipoPanel from "../../../components/MiEquipoPanel";

export default function TorneoPublico({ params, searchParams }) {
  const { id } = params;
  const volverToken = searchParams?.volver;
  const { T } = useTheme();
  const [tournament, setTournament] = useState(null);
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: t } = await supabase.from("tournaments").select("*").eq("id", id).single();
    const { data: ts } = await supabase
      .from("teams")
      .select("id, tournament_id, name, players, paid, created_at")
      .eq("tournament_id", id);
    const { data: ms } = await supabase
      .from("matches")
      .select("id, tournament_id, bracket, round_index, match_index, team1_id, team2_id, winner_id, score_a, score_b, bye")
      .eq("tournament_id", id);
    setTournament(t);
    setTeams(ts || []);
    setMatches(ms || []);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel(`torneo-publico-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "matches", filter: `tournament_id=eq.${id}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "tournaments", filter: `id=eq.${id}` }, load)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [id, load]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: T.bg, color: T.ink }}>
        Cargando el mazo…
      </div>
    );
  }
  if (!tournament) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-6" style={{ background: T.bg, color: T.ink }}>
        No encontramos este torneo.
      </div>
    );
  }

  const teamsById = {};
  teams.forEach((t) => (teamsById[t.id] = t));
  const mainMatchesTodos = matches.filter((m) => m.bracket === "main");
  const repMatches = matches.filter((m) => m.bracket === "repechaje");

  // Los competidores no ven una fase hasta que la anterior termina del
  // todo (mismo criterio que usa el mensaje de WhatsApp del organizador:
  // no se adelanta nada de la fase siguiente hasta cerrar la actual).
  function rondaMaximaVisible(ms) {
    const porRonda = {};
    ms.forEach((m) => {
      porRonda[m.round_index] = porRonda[m.round_index] || [];
      porRonda[m.round_index].push(m);
    });
    const indices = Object.keys(porRonda).map(Number).sort((a, b) => a - b);
    let max = 0;
    for (const idx of indices) {
      if (idx === 0) continue;
      const anterior = porRonda[idx - 1] || [];
      const anteriorCompleta = anterior.length > 0 && anterior.every((m) => m.bye || m.winner_id);
      if (anteriorCompleta) max = idx;
      else break;
    }
    return max;
  }
  const maxVisibleMain = rondaMaximaVisible(mainMatchesTodos);
  const mainMatches = mainMatchesTodos.filter((m) => m.round_index <= maxVisibleMain);

  const hayFasesOcultas = mainMatchesTodos.length > mainMatches.length;

  return (
    <div className="min-h-screen transition-colors duration-500" style={{ background: T.bg }}>
      <div className="max-w-3xl lg:max-w-[92vw] xl:max-w-[1500px] mx-auto px-4 py-6">
        <div className="flex justify-between mb-2">
          <Link href="/" className="text-xs underline" style={{ color: T.inkDim }}>
            ← Inicio
          </Link>
          <ThemeToggleButton />
        </div>
        <div className="flex items-center gap-2 justify-center mb-1">
          <SuitIcon suit="espada" size={20} />
          <SuitIcon suit="basto" size={20} />
          <SuitIcon suit="oro" size={20} />
          <SuitIcon suit="copa" size={20} />
        </div>
        <h1 className="text-3xl font-black text-center" style={{ color: T.ink, fontFamily: "Georgia, serif" }}>
          {tournament.nombre || "Torneo de Truco"}
        </h1>
        <p className="text-center text-sm mb-6" style={{ color: T.goldBright }}>
          {[tournament.ubicacion, tournament.fecha, tournament.categoria].filter(Boolean).join(" · ")}
        </p>

        {tournament.champion_id && (
          <div
            className="rounded-3xl p-5 mb-5 text-center border-2 shadow-md"
            style={{ background: "#FBF3E3", borderColor: "#EAC27A" }}
          >
            <div className="text-xs font-bold uppercase tracking-widest" style={{ color: "#B85C55" }}>
              🏆 Campeón
            </div>
            <div className="text-2xl font-black mt-1" style={{ color: "#33453E" }}>
              {teamsById[tournament.champion_id]?.name}
            </div>
            <div className="text-xs mt-1 italic" style={{ color: "#B85C55" }}>
              {fraseCampeonAlAzar()}
            </div>
          </div>
        )}

        {tournament.started && (
          <MiEquipoPanel tournament={tournament} teams={teams} matches={mainMatchesTodos} teamsById={teamsById} />
        )}

        {!tournament.started ? (
          <p className="text-center text-sm" style={{ color: T.inkDim }}>
            El sorteo todavía no se hizo.
          </p>
        ) : (
          <>
            <BracketDisplay matches={mainMatches} teamsById={teamsById} />
            {hayFasesOcultas && (
              <p className="text-center text-xs mt-3" style={{ color: T.inkDim }}>
                Las siguientes fases se muestran apenas termine la actual.
              </p>
            )}
            {tournament.repechaje && (
              <div className="mt-6">
                {tournament.repechaje_champion_id && (
                  <div
                    className="rounded-3xl p-5 mb-5 text-center border-2 shadow-md"
                    style={{ background: "#FBF3E3", borderColor: "#EAC27A" }}
                  >
                    <div className="text-xs font-bold uppercase tracking-widest" style={{ color: "#B85C55" }}>
                      🏆 Campeón del repechaje
                    </div>
                    <div className="text-2xl font-black mt-1" style={{ color: "#33453E" }}>
                      {teamsById[tournament.repechaje_champion_id]?.name}
                    </div>
                    <div className="text-xs mt-1 italic" style={{ color: "#B85C55" }}>
                      {fraseCampeonAlAzar()}
                    </div>
                  </div>
                )}
                <h2 className="font-bold mb-3" style={{ color: T.gold }}>
                  Cuadro de repechaje
                </h2>
                {repMatches.length === 0 ? (
                  <p className="text-sm" style={{ color: T.inkDim }}>
                    Se arma solo apenas termine toda la primera ronda del cuadro principal.
                  </p>
                ) : (
                  <BracketDisplay matches={repMatches} teamsById={teamsById} />
                )}
              </div>
            )}
          </>
        )}
      </div>

      {volverToken && (
        <Link
          href={`/partido/${volverToken}`}
          className="fixed bottom-5 left-1/2 -translate-x-1/2 px-5 py-3 rounded-full font-bold text-sm shadow-lg transition-transform duration-150 active:scale-95"
          style={{ background: T.gold, color: T.ink }}
        >
          ← Volver a mi partido
        </Link>
      )}
    </div>
  );
}
