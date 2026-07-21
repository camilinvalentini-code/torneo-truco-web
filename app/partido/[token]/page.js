"use client";
import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useTheme } from "../../../lib/theme";
import { useSkin } from "../../../lib/scoreboardSkin";
import { supabase } from "../../../lib/supabaseClient";
import { fraseCampeonAlAzar } from "../../../lib/champFrases";
import { useWakeLock } from "../../../lib/useWakeLock";
import Scoreboard from "../../../components/Scoreboard";
import ThemeToggleButton from "../../../components/ThemeToggleButton";
import SuitIcon from "../../../components/SuitIcon";

export default function PartidoPage({ params }) {
  const { token } = params;
  useWakeLock();
  const { T } = useTheme();
  const { layout, marks, setLayout, setMarks } = useSkin();
  const [match, setMatch] = useState(null);
  const [teams, setTeams] = useState({});
  const [puntosMax, setPuntosMax] = useState(30);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [yaConfirmeLocal, setYaConfirmeLocal] = useState(false);

  const load = useCallback(async () => {
    const { data: m } = await supabase.from("matches").select("*").eq("match_token", token).single();
    if (!m) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setMatch(m);
    const { data: t } = await supabase.from("tournaments").select("puntos_max").eq("id", m.tournament_id).single();
    setPuntosMax(t?.puntos_max || 30);
    const ids = [m.team1_id, m.team2_id].filter(Boolean);
    if (ids.length) {
      const { data: ts } = await supabase.from("teams").select("*").in("id", ids);
      const map = {};
      (ts || []).forEach((t) => (map[t.id] = t));
      setTeams(map);
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!match) return;
    const channel = supabase
      .channel(`match-${match.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "matches", filter: `id=eq.${match.id}` },
        (payload) => setMatch(payload.new)
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [match?.id]);

  async function onChange(side, delta) {
    if (!match || busy || match.winner_id || match.confirmacion_pendiente) return;
    const field = side === "A" ? "score_a" : "score_b";
    const proyectado = Math.max(0, Math.min(puntosMax, match[field] + delta));
    if (delta > 0 && proyectado >= puntosMax) {
      // No lo confirmamos solo en este celular — lo proponemos (eso ya
      // cuenta como la primera confirmación), y falta que la otra mesa
      // confirme también para que se cierre de verdad.
      setBusy(true);
      const { data, error } = await supabase.rpc("proponer_cierre", { p_match_token: token, p_lado: side });
      if (!error && data) setMatch(data);
      setYaConfirmeLocal(true);
      setBusy(false);
      return;
    }
    setBusy(true);
    setMatch((m) => ({ ...m, [field]: proyectado })); // respuesta inmediata en pantalla
    const { data, error } = await supabase.rpc("anotar_punto", {
      p_match_token: token,
      p_lado: side,
      p_delta: delta,
    });
    if (!error && data) setMatch(data);
    setBusy(false);
  }

  async function confirmarCierre() {
    setBusy(true);
    const { data, error } = await supabase.rpc("confirmar_cierre", { p_match_token: token });
    if (!error && data) setMatch(data);
    setYaConfirmeLocal(true);
    setBusy(false);
  }

  async function cancelarCierre() {
    setBusy(true);
    const { data, error } = await supabase.rpc("cancelar_cierre", { p_match_token: token });
    if (!error && data) setMatch(data);
    setYaConfirmeLocal(false);
    setBusy(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: T.bg, color: T.ink }}>
        Cargando la mesa…
      </div>
    );
  }
  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-6" style={{ background: T.bg, color: T.ink }}>
        No encontramos este partido. Puede que el link esté mal copiado.
      </div>
    );
  }

  const nameA = teams[match.team1_id]?.name || "Equipo A";
  const nameB = match.team2_id ? (teams[match.team2_id]?.name || "Equipo B") : "— esperando rival —";
  const winnerName = match.winner_id ? teams[match.winner_id]?.name : null;

  return (
    <div className="min-h-screen transition-colors duration-500" style={{ background: T.bg }}>
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="flex justify-between mb-3">
          <Link href="/" className="text-xs underline" style={{ color: T.inkDim }}>
            ← Inicio
          </Link>
          <ThemeToggleButton />
        </div>
        <div className="flex justify-center mb-2">
          <SuitIcon suit="espada" size={22} />
        </div>
        <h1 className="text-xl font-black text-center mb-1" style={{ color: T.ink, fontFamily: "Georgia, serif" }}>
          Anotador de partido
        </h1>
        <p className="text-center text-xs mb-5" style={{ color: T.inkDim }}>
          Solo un equipo carga los puntos — cualquiera puede deshacer con −1
        </p>

        {winnerName && (
          <div
            className="rounded-3xl p-5 mb-5 text-center border-2 shadow-md"
            style={{ background: "#FBF3E3", borderColor: "#EAC27A" }}
          >
            <div className="text-xs font-bold uppercase tracking-widest" style={{ color: "#B85C55" }}>
              🏆 Ganó y avanza
            </div>
            <div className="text-xl font-black mt-1" style={{ color: "#33453E" }}>
              {winnerName}
            </div>
            <div className="text-xs mt-1 italic" style={{ color: "#B85C55" }}>
              {fraseCampeonAlAzar()}
            </div>
          </div>
        )}

        <div className="flex gap-2 justify-center flex-wrap mb-4">
          <button
            onClick={() => setLayout("apilado")}
            className="text-[11px] font-bold px-3 py-1.5 rounded-full transition-colors duration-150"
            style={{
              background: layout === "apilado" ? T.gold : T.panel,
              color: layout === "apilado" ? T.ink : T.inkDim,
              border: `1px solid ${T.line}`,
            }}
          >
            apilado
          </button>
          <button
            onClick={() => setLayout("vertical")}
            className="text-[11px] font-bold px-3 py-1.5 rounded-full transition-colors duration-150"
            style={{
              background: layout === "vertical" ? T.gold : T.panel,
              color: layout === "vertical" ? T.ink : T.inkDim,
              border: `1px solid ${T.line}`,
            }}
          >
            vertical
          </button>
          <span style={{ color: T.inkDim, fontSize: 11 }}>·</span>
          <button
            onClick={() => setMarks("palito")}
            className="text-[11px] font-bold px-3 py-1.5 rounded-full transition-colors duration-150"
            style={{
              background: marks === "palito" ? T.gold : T.panel,
              color: marks === "palito" ? T.ink : T.inkDim,
              border: `1px solid ${T.line}`,
            }}
          >
            palitos
          </button>
          <button
            onClick={() => setMarks("fosforo")}
            className="text-[11px] font-bold px-3 py-1.5 rounded-full transition-colors duration-150"
            style={{
              background: marks === "fosforo" ? T.gold : T.panel,
              color: marks === "fosforo" ? T.ink : T.inkDim,
              border: `1px solid ${T.line}`,
            }}
          >
            fósforos
          </button>
        </div>

        {match.confirmacion_pendiente && (
          <div
            className="rounded-2xl p-4 mb-4 text-center border-2 shadow-md"
            style={{ background: "#FBF3E3", borderColor: "#EAC27A" }}
          >
            <p className="text-sm font-bold mb-1" style={{ color: "#33453E" }}>
              ¿Confirmás que "{match.lado_propuesto === "A" ? nameA : nameB}" ganó {puntosMax} puntos? Esto cierra
              el partido y avanza de fase.
            </p>
            <p className="text-xs mb-3" style={{ color: "#B85C55" }}>
              {yaConfirmeLocal
                ? "Ya confirmaste desde este celular — falta que confirmen desde el otro."
                : "Hace falta que confirmen las dos mesas."}
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={confirmarCierre}
                disabled={busy || yaConfirmeLocal}
                className="px-5 py-2 rounded-xl font-bold text-sm disabled:opacity-40"
                style={{ background: "#EAC27A", color: "#33453E" }}
              >
                {yaConfirmeLocal ? "Ya confirmaste ✓" : "Confirmar"}
              </button>
              <button
                onClick={cancelarCierre}
                disabled={busy}
                className="px-5 py-2 rounded-xl font-bold text-sm disabled:opacity-60"
                style={{ background: "transparent", color: "#B85C55", border: "1px solid #B85C55" }}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        <Scoreboard
          nameA={nameA}
          nameB={nameB}
          scoreA={match.score_a}
          scoreB={match.score_b}
          onChange={onChange}
          disabled={busy || !!match.winner_id || match.confirmacion_pendiente}
          layout={layout}
          marks={marks}
          maxScore={puntosMax}
        />

        <Link
          href={`/torneo/${match.tournament_id}?volver=${token}`}
          className="block text-center text-sm underline mt-6 font-semibold"
          style={{ color: T.goldBright }}
        >
          Ver el fixture completo del torneo →
        </Link>
      </div>
    </div>
  );
}
