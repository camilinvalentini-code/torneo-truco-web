"use client";
import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { useTheme } from "../../../../lib/theme";
import { useAuth } from "../../../../lib/useAuth";
import { supabase } from "../../../../lib/supabaseClient";
import TeamList from "../../../../components/TeamList";
import BracketDisplay from "../../../../components/BracketDisplay";
import ThemeToggleButton from "../../../../components/ThemeToggleButton";
import SuitIcon from "../../../../components/SuitIcon";
import { fraseCampeonAlAzar } from "../../../../lib/champFrases";

export default function AdminPage({ params }) {
  const { id } = params;
  const { T } = useTheme();
  const router = useRouter();
  const { session, profile, loading: authLoading } = useAuth();

  const [tournament, setTournament] = useState(null);
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  const [newName, setNewName] = useState("");
  const [jugadorInput, setJugadorInput] = useState("");
  const [jugadoresChips, setJugadoresChips] = useState([]); // [{id?, name}]
  const [sugerencias, setSugerencias] = useState([]);
  const [error, setError] = useState("");
  const [origin, setOrigin] = useState("");
  const [qrTarget, setQrTarget] = useState(null); // match_token abierto en el modal de QR
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [editandoInfo, setEditandoInfo] = useState(false);
  const [infoNombre, setInfoNombre] = useState("");
  const [infoUbicacion, setInfoUbicacion] = useState("");
  const [infoFecha, setInfoFecha] = useState("");
  const [vista, setVista] = useState("mesas"); // "mesas" | "cuadro"
  const [simulando, setSimulando] = useState(false);
  const [mostrarEquipos, setMostrarEquipos] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  const load = useCallback(async () => {
    const { data: t } = await supabase.from("tournaments").select("*").eq("id", id).single();
    if (!t) {
      setLoading(false);
      return;
    }
    const { data: ts } = await supabase.from("teams").select("*").eq("tournament_id", id).order("created_at");
    const { data: ms } = await supabase.from("matches").select("*").eq("tournament_id", id);

    const teamIds = (ts || []).map((tm) => tm.id);
    let teamsConJugadores = ts || [];
    if (teamIds.length > 0) {
      const { data: tp } = await supabase
        .from("team_players")
        .select("team_id, players(name)")
        .in("team_id", teamIds);
      const porEquipo = {};
      (tp || []).forEach((row) => {
        porEquipo[row.team_id] = porEquipo[row.team_id] || [];
        if (row.players?.name) porEquipo[row.team_id].push(row.players.name);
      });
      teamsConJugadores = (ts || []).map((tm) => ({
        ...tm,
        players: porEquipo[tm.id]?.length ? porEquipo[tm.id].join(", ") : tm.players,
      }));
    }

    setTournament(t);
    setTeams(teamsConJugadores);
    setMatches(ms || []);
    setLoading(false);
    setInfoNombre((prev) => prev || t.nombre || "");
    setInfoUbicacion((prev) => prev || t.ubicacion || "");
    setInfoFecha((prev) => prev || t.fecha || "");
  }, [id]);

  useEffect(() => {
    if (!authLoading && !session) router.push("/organizador/acceso");
  }, [authLoading, session, router]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`admin-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "matches", filter: `tournament_id=eq.${id}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "tournaments", filter: `id=eq.${id}` }, load)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [id, load]);

  function normalizarNombre(s) {
    return s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  async function buscarJugadores(texto) {
    setJugadorInput(texto);
    if (texto.trim().length < 2) {
      setSugerencias([]);
      return;
    }
    const { data } = await supabase.rpc("buscar_jugadores", { q: texto.trim() });
    setSugerencias(data || []);
  }
  function agregarChip(jugador) {
    const yaEsta = jugadoresChips.some((j) => normalizarNombre(j.name) === normalizarNombre(jugador.name));
    if (!yaEsta) setJugadoresChips((prev) => [...prev, jugador]);
    setJugadorInput("");
    setSugerencias([]);
  }
  function quitarChip(name) {
    setJugadoresChips((prev) => prev.filter((j) => j.name !== name));
  }
  function onJugadorKeyDown(e) {
    if (e.key === "Enter" && jugadorInput.trim()) {
      e.preventDefault();
      agregarChip({ name: jugadorInput.trim() });
    }
  }

  async function ensurePlayerId(name) {
    const norm = normalizarNombre(name);
    const { data: existente } = await supabase.from("players").select("id").eq("name_norm", norm).limit(1);
    if (existente && existente.length > 0) return existente[0].id;
    const { data: creado, error: err } = await supabase
      .from("players")
      .insert({ name: name.trim(), name_norm: norm })
      .select("id")
      .single();
    if (err) return null;
    return creado.id;
  }

  async function addTeam() {
    const name = newName.trim();
    if (!name) return;
    const dup = teams.some((t) => t.name.trim().toLowerCase() === name.toLowerCase());
    if (dup) {
      setError(`Ya hay un equipo anotado como "${name}".`);
      return;
    }
    setError("");
    const { data: nuevoEquipo, error: err } = await supabase
      .from("teams")
      .insert({ tournament_id: id, name, players: "", paid: false })
      .select()
      .single();
    if (err) {
      setError("No se pudo agregar el equipo.");
      return;
    }
    for (const j of jugadoresChips) {
      const playerId = await ensurePlayerId(j.name);
      if (playerId) {
        await supabase.from("team_players").insert({ team_id: nuevoEquipo.id, player_id: playerId });
      }
    }
    setNewName("");
    setJugadoresChips([]);
    setJugadorInput("");
    setSugerencias([]);
    load();
  }
  async function removeTeam(teamId) {
    if (tournament.started) return;
    await supabase.from("teams").delete().eq("id", teamId);
    load();
  }
  async function togglePaid(teamId, paid) {
    await supabase.from("teams").update({ paid }).eq("id", teamId);
    load();
  }

  async function doSorteo() {
    if (teams.length < 3) {
      setError("Necesitás al menos 3 equipos anotados para hacer el sorteo.");
      return;
    }
    setError("");
    const { error: err } = await supabase.rpc("generar_bracket", {
      p_tournament_id: id,
      p_bracket: "main",
      p_team_ids: teams.map((t) => t.id),
    });
    if (err) {
      setError("No se pudo hacer el sorteo. Probá de nuevo.");
      console.error(err);
      return;
    }
    await supabase.from("tournaments").update({ started: true }).eq("id", id);
    load();
  }

  function sorteoSinJugar() {
    if (!tournament?.started) return false;
    const ronda0 = matches.filter((m) => m.bracket === "main" && m.round_index === 0);
    return ronda0.every((m) => m.bye || (!m.winner_id && m.score_a === 0 && m.score_b === 0));
  }

  async function resortear() {
    if (!window.confirm("¿Volver a sortear? Se descarta el cuadro actual y se arma uno nuevo desde cero.")) return;
    setError("");
    await supabase.from("matches").delete().eq("tournament_id", id).eq("bracket", "main");
    await supabase.from("matches").delete().eq("tournament_id", id).eq("bracket", "repechaje");
    await supabase.from("tournaments").update({ champion_id: null, repechaje_champion_id: null }).eq("id", id);
    const { error: err } = await supabase.rpc("generar_bracket", {
      p_tournament_id: id,
      p_bracket: "main",
      p_team_ids: teams.map((t) => t.id),
    });
    if (err) {
      setError("No se pudo resortear. Probá de nuevo.");
      console.error(err);
      return;
    }
    load();
  }

  async function openQr(token) {
    const url = `${origin}/partido/${token}`;
    const dataUrl = await QRCode.toDataURL(url, { margin: 1, width: 260, color: { dark: "#33453E", light: "#FBF3E3" } });
    setQrTarget(token);
    setQrDataUrl(dataUrl);
  }

  async function guardarInfo() {
    if (!infoNombre.trim() || !infoUbicacion.trim()) {
      setError("El nombre y la ubicación son obligatorios.");
      return;
    }
    setError("");
    await supabase
      .from("tournaments")
      .update({ nombre: infoNombre.trim(), ubicacion: infoUbicacion.trim(), fecha: infoFecha.trim() })
      .eq("id", id);
    setEditandoInfo(false);
    load();
  }

  async function reabrirPartido(match) {
    const hermanos = matches.filter((m) => m.bracket === match.bracket);
    const maxRound = Math.max(...hermanos.map((m) => m.round_index));
    if (match.round_index < maxRound) {
      const siguienteIdx = Math.floor(match.match_index / 2);
      const siguiente = hermanos.find((m) => m.round_index === match.round_index + 1 && m.match_index === siguienteIdx);
      if (siguiente?.winner_id) {
        window.alert(
          "No se puede reabrir: el ganador de este partido ya jugó (y quizás ganó) el siguiente. Reabrí primero ese otro partido."
        );
        return;
      }
    }
    if (!window.confirm("¿Reabrir este partido? El resultado actual se borra y vuelve a estar 'por jugar'.")) return;

    if (match.round_index < maxRound) {
      const siguienteIdx = Math.floor(match.match_index / 2);
      const slot = match.match_index % 2 === 0 ? "team1_id" : "team2_id";
      const siguiente = hermanos.find((m) => m.round_index === match.round_index + 1 && m.match_index === siguienteIdx);
      if (siguiente) {
        await supabase.from("matches").update({ [slot]: null }).eq("id", siguiente.id);
      }
    } else if (match.bracket === "main") {
      await supabase.from("tournaments").update({ champion_id: null }).eq("id", id);
    } else {
      await supabase.from("tournaments").update({ repechaje_champion_id: null }).eq("id", id);
    }
    await supabase.from("matches").update({ winner_id: null }).eq("id", match.id);
    load();
  }

  async function forzarGanador(match, winnerId) {
    const nombreEquipo = teamsById[winnerId]?.name || "este equipo";
    if (!window.confirm(`¿Marcar a "${nombreEquipo}" como ganador de este partido?`)) return;
    await supabase.rpc("declarar_ganador", { p_match_id: match.id, p_winner_id: winnerId });
    load();
  }

  function repechajeSinJugar() {
    if (!repMatches.length) return true;
    return repMatches.every((m) => !m.winner_id && m.score_a === 0 && m.score_b === 0);
  }

  async function quitarDeRepechaje(teamIdAQuitar) {
    const nombre = teamsById[teamIdAQuitar]?.name || "este equipo";
    if (!window.confirm(`¿Sacar a "${nombre}" del repechaje? Se rearma el cuadro con los que queden.`)) return;

    const participantes = new Set();
    repMatches.forEach((m) => {
      if (m.team1_id) participantes.add(m.team1_id);
      if (m.team2_id) participantes.add(m.team2_id);
    });
    participantes.delete(teamIdAQuitar);
    const restantes = [...participantes];

    await supabase.from("matches").delete().eq("tournament_id", id).eq("bracket", "repechaje");

    if (restantes.length >= 2) {
      await supabase.rpc("generar_bracket", { p_tournament_id: id, p_bracket: "repechaje", p_team_ids: restantes });
      await supabase.from("tournaments").update({ repechaje_champion_id: null }).eq("id", id);
    } else if (restantes.length === 1) {
      await supabase.from("tournaments").update({ repechaje_champion_id: restantes[0] }).eq("id", id);
    } else {
      await supabase.from("tournaments").update({ repechaje_champion_id: null }).eq("id", id);
    }
    load();
  }

  async function simularTorneoCompleto() {
    if (!window.confirm("Esto va a completar TODO el torneo con resultados al azar (para testear). ¿Seguro?")) return;
    setSimulando(true);
    for (let i = 0; i < 200; i++) {
      const { data: pend } = await supabase
        .from("matches")
        .select("*")
        .eq("tournament_id", id)
        .is("winner_id", null)
        .not("team1_id", "is", null)
        .not("team2_id", "is", null);
      if (!pend || pend.length === 0) break;
      const m = pend[0];
      const winnerId = Math.random() < 0.5 ? m.team1_id : m.team2_id;
      await supabase.rpc("declarar_ganador", { p_match_id: m.id, p_winner_id: winnerId });
    }
    setSimulando(false);
    load();
  }

  const esDueño = session && tournament && (tournament.organizador_id === session.user.id || profile?.role === "admin");

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: T.bg, color: T.ink }}>
        Cargando…
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
  if (!esDueño) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center text-center px-6 gap-3"
        style={{ background: T.bg, color: T.ink }}
      >
        <p>Este torneo no es tuyo, así que no lo podés administrar.</p>
        <Link href={`/torneo/${id}`} className="underline font-bold" style={{ color: T.goldBright }}>
          Ver el cuadro en vivo (solo lectura)
        </Link>
      </div>
    );
  }

  const teamsById = {};
  teams.forEach((t) => (teamsById[t.id] = t));
  const mainMatches = matches.filter((m) => m.bracket === "main");
  const repMatches = matches.filter((m) => m.bracket === "repechaje");
  const publicUrl = `${origin}/torneo/${id}`;

  return (
    <div className="min-h-screen transition-colors duration-500" style={{ background: T.bg }}>
      <div className="max-w-3xl lg:max-w-6xl mx-auto px-4 py-6">
        <div className="flex justify-between mb-2">
          <Link href="/organizador/panel" className="text-xs underline" style={{ color: T.inkDim }}>
            ← Mi panel
          </Link>
          <ThemeToggleButton />
        </div>
        <div className="flex items-center gap-2 justify-center mb-1">
          <SuitIcon suit="espada" size={20} />
          <SuitIcon suit="basto" size={20} />
          <SuitIcon suit="oro" size={20} />
          <SuitIcon suit="copa" size={20} />
        </div>
        <h1 className="text-2xl font-black text-center" style={{ color: T.ink, fontFamily: "Georgia, serif" }}>
          {tournament.nombre || "Torneo de Truco"} · panel del organizador
        </h1>
        <p className="text-center text-xs mb-1" style={{ color: T.inkDim }}>
          {[tournament.ubicacion, tournament.fecha, tournament.categoria].filter(Boolean).join(" · ")}
          {" · "}
          <button onClick={() => setEditandoInfo((v) => !v)} className="underline" style={{ color: T.inkDim }}>
            ✏️ Editar datos
          </button>
        </p>

        {editandoInfo && (
          <div
            className="rounded-2xl p-4 mb-4 border shadow-sm lg:max-w-md lg:mx-auto"
            style={{ background: T.panel, borderColor: T.line }}
          >
            <div className="flex flex-col gap-2">
              <input
                value={infoNombre}
                onChange={(e) => setInfoNombre(e.target.value)}
                placeholder="Nombre del torneo*"
                className="px-3 py-2 rounded-xl text-sm"
                style={{ background: T.bg, color: T.ink, border: `1px solid ${T.line}` }}
              />
              <input
                value={infoUbicacion}
                onChange={(e) => setInfoUbicacion(e.target.value)}
                placeholder="Ubicación*"
                className="px-3 py-2 rounded-xl text-sm"
                style={{ background: T.bg, color: T.ink, border: `1px solid ${T.line}` }}
              />
              <input
                value={infoFecha}
                onChange={(e) => setInfoFecha(e.target.value)}
                placeholder="Fecha"
                className="px-3 py-2 rounded-xl text-sm"
                style={{ background: T.bg, color: T.ink, border: `1px solid ${T.line}` }}
              />
              <div className="flex gap-2 mt-1">
                <button
                  onClick={guardarInfo}
                  className="flex-1 py-2 rounded-xl font-bold text-sm"
                  style={{ background: T.gold, color: T.ink }}
                >
                  Guardar
                </button>
                <button
                  onClick={() => setEditandoInfo(false)}
                  className="flex-1 py-2 rounded-xl font-bold text-sm"
                  style={{ background: T.panelLight, color: T.ink }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
        {origin && (
          <p className="text-center text-sm mb-5">
            <a href={publicUrl} target="_blank" rel="noreferrer" className="underline font-bold" style={{ color: T.gold }}>
              Seguí el torneo en vivo acá
            </a>
          </p>
        )}

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

        {!tournament.started ? (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 lg:items-start gap-4 mb-4 lg:max-w-4xl lg:mx-auto">
              <div className="rounded-2xl p-4 border shadow-sm" style={{ background: T.panel, borderColor: T.line }}>
                <h2 className="font-bold mb-3" style={{ color: T.gold }}>
                  Anotar equipo
                </h2>
                <div className="flex flex-col gap-2">
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTeam();
                      }
                    }}
                    placeholder={tournament.categoria === "1v1" ? "Nombre del jugador" : "Nombre del equipo"}
                    className="px-3 py-2 rounded-xl text-sm"
                    style={{ background: T.bg, color: T.ink, border: `1px solid ${T.line}` }}
                  />

                  {tournament.categoria !== "1v1" && (
                    <>
                      {jugadoresChips.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {jugadoresChips.map((j) => (
                            <span
                              key={j.name}
                              className="text-xs px-2 py-1 rounded-full font-semibold flex items-center gap-1"
                              style={{ background: T.panelLight, color: T.ink }}
                            >
                              {j.name}
                              <button onClick={() => quitarChip(j.name)} style={{ color: T.redDim }}>
                                ✕
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="relative">
                        <input
                          value={jugadorInput}
                          onChange={(e) => buscarJugadores(e.target.value)}
                          onKeyDown={onJugadorKeyDown}
                          placeholder="Agregar jugador (Enter para sumarlo)"
                          className="w-full px-3 py-2 rounded-xl text-sm"
                          style={{ background: T.bg, color: T.ink, border: `1px solid ${T.line}` }}
                        />
                        {sugerencias.length > 0 && (
                          <div
                            className="absolute z-10 w-full mt-1 rounded-xl border shadow-md overflow-hidden"
                            style={{ background: T.panel, borderColor: T.line }}
                          >
                            {sugerencias.map((s) => (
                              <button
                                key={s.id}
                                onClick={() => agregarChip(s)}
                                className="w-full text-left px-3 py-2 text-sm"
                                style={{ color: T.ink }}
                              >
                                {s.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  <button
                    onClick={addTeam}
                    className="py-2 rounded-xl font-bold text-sm transition-all duration-200 hover:scale-105 active:scale-95"
                    style={{ background: T.gold, color: T.ink }}
                  >
                    + Agregar equipo
                  </button>
                </div>
              </div>

              {teams.length > 0 && (
                <div className="rounded-2xl p-4 border shadow-sm" style={{ background: T.panel, borderColor: T.line }}>
                  <h2 className="font-bold mb-3" style={{ color: T.gold }}>
                    Equipos anotados ({teams.length})
                  </h2>
                  <TeamList teams={teams} editable onTogglePaid={togglePaid} onRemove={removeTeam} />
                </div>
              )}
            </div>

            <div className="lg:max-w-md lg:mx-auto">
              {error && (
                <p className="text-sm text-center mb-3" style={{ color: T.goldBright }}>
                  {error}
                </p>
              )}

              <button
                onClick={doSorteo}
                disabled={teams.length < 3}
                className="w-full py-3 rounded-2xl font-black text-lg transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50"
                style={{ background: T.gold, color: T.ink }}
              >
                ⚔️ Hacer los cruces
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="rounded-2xl p-4 mb-4 border shadow-sm" style={{ background: T.panel, borderColor: T.line }}>
              <button
                onClick={() => setMostrarEquipos((v) => !v)}
                className="w-full flex items-center justify-between font-bold"
                style={{ color: T.gold }}
              >
                <span>Equipos y pagos ({teams.length})</span>
                <span className="text-xs" style={{ color: T.inkDim }}>
                  {mostrarEquipos ? "ocultar ▲" : "mostrar ▼"}
                </span>
              </button>
              {mostrarEquipos && (
                <div className="mt-3">
                  <TeamList teams={teams} onTogglePaid={togglePaid} twoColumns />
                </div>
              )}
            </div>

            {sorteoSinJugar() && (
              <button
                onClick={resortear}
                className="w-full py-2 rounded-2xl font-bold text-xs mb-3 transition-all duration-200 hover:scale-105 active:scale-95"
                style={{ background: T.panelLight, color: T.ink, border: `1px solid ${T.gold}` }}
              >
                🔄 Resortear (todavía no se jugó nada)
              </button>
            )}

            {!tournament.champion_id && (
              <button
                onClick={simularTorneoCompleto}
                disabled={simulando}
                className="w-full py-2 rounded-2xl font-bold text-xs mb-3 transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-60"
                style={{ background: T.panelLight, color: T.redDim, border: `1px solid ${T.line}` }}
              >
                {simulando ? "Simulando…" : "🎲 Simular resultados al azar (solo para test)"}
              </button>
            )}

            <div className="flex rounded-2xl overflow-hidden border mb-4" style={{ borderColor: T.gold }}>
              <button
                onClick={() => setVista("mesas")}
                className="flex-1 py-2.5 text-sm font-bold transition-colors duration-200"
                style={{ background: vista === "mesas" ? T.gold : "transparent", color: vista === "mesas" ? T.ink : T.inkDim }}
              >
                🎲 Mesas
              </button>
              <button
                onClick={() => setVista("cuadro")}
                className="flex-1 py-2.5 text-sm font-bold transition-colors duration-200"
                style={{ background: vista === "cuadro" ? T.gold : "transparent", color: vista === "cuadro" ? T.ink : T.inkDim }}
              >
                🏆 Cuadro completo
              </button>
            </div>

            {vista === "mesas" ? (
              <MesasPendientes
                matches={[...mainMatches, ...repMatches]}
                teamsById={teamsById}
                onOpenQr={openQr}
                onDeclareWinner={forzarGanador}
              />
            ) : (
              <>
                <h2 className="font-bold mb-3" style={{ color: T.gold }}>
                  Cuadro principal — tocá un equipo para forzar el resultado
                </h2>
                <div className="mb-2">
                  <BracketDisplayWithQr
                    matches={mainMatches}
                    teamsById={teamsById}
                    origin={origin}
                    onOpenQr={openQr}
                    onDeclareWinner={forzarGanador}
                    onReabrir={reabrirPartido}
                  />
                </div>

                {tournament.repechaje && repMatches.length > 0 && (
                  <div className="mt-6">
                    <h2 className="font-bold mb-3" style={{ color: T.gold }}>
                      Cuadro de repechaje
                    </h2>

                    {repechajeSinJugar() && (
                      <div className="rounded-2xl p-4 mb-4 border shadow-sm" style={{ background: T.panel, borderColor: T.line }}>
                        <p className="text-xs mb-2" style={{ color: T.inkDim }}>
                          ¿Alguno no va a pagar de nuevo para el repechaje? Sacalo de la lista — el cuadro se
                          rearma solo con los que queden.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {[...new Set(repMatches.flatMap((m) => [m.team1_id, m.team2_id]).filter(Boolean))].map(
                            (tid) => (
                              <span
                                key={tid}
                                className="text-xs pl-3 pr-1.5 py-1.5 rounded-full font-semibold flex items-center gap-1.5"
                                style={{ background: T.panelLight, color: T.ink }}
                              >
                                {teamsById[tid]?.name}
                                <button
                                  onClick={() => quitarDeRepechaje(tid)}
                                  className="w-5 h-5 rounded-full flex items-center justify-center"
                                  style={{ background: T.redDim, color: "#FFFFFF" }}
                                  title="Sacar del repechaje"
                                >
                                  ✕
                                </button>
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    )}

                    <BracketDisplayWithQr
                      matches={repMatches}
                      teamsById={teamsById}
                      origin={origin}
                      onOpenQr={openQr}
                      onDeclareWinner={forzarGanador}
                      onReabrir={reabrirPartido}
                    />
                  </div>
                )}
              </>
            )}
          </>
        )}

        {qrTarget && (
          <div
            className="fixed inset-0 flex items-center justify-center p-6"
            style={{ background: "rgba(0,0,0,0.5)" }}
            onClick={() => setQrTarget(null)}
          >
            <div
              className="rounded-3xl p-6 text-center max-w-xs w-full"
              style={{ background: "#FBF3E3" }}
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-sm font-bold mb-3" style={{ color: "#33453E" }}>
                Escaneá para anotar esta mesa
              </p>
              {qrDataUrl && <img src={qrDataUrl} alt="QR del partido" className="mx-auto rounded-xl" />}
              <button
                onClick={() => setQrTarget(null)}
                className="mt-4 text-xs underline font-bold"
                style={{ color: "#B85C55" }}
              >
                cerrar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Vista rápida: una tarjeta por mesa pendiente, con acceso directo al QR,
// sin tener que scrollear todo el cuadro para llegar hasta ahí.
function MesasPendientes({ matches, teamsById, onOpenQr, onDeclareWinner }) {
  const { T } = useTheme();
  const pendientes = matches.filter((m) => !m.bye && m.team1_id && m.team2_id && !m.winner_id && m.match_token);
  const jugados = matches.filter((m) => !m.bye && m.team1_id && m.team2_id && m.winner_id);

  if (pendientes.length === 0 && jugados.length === 0) {
    return (
      <p className="text-sm text-center" style={{ color: T.inkDim }}>
        Todavía no hay partidos con los dos equipos definidos.
      </p>
    );
  }

  return (
    <div>
      {pendientes.length > 0 && (
        <>
          <h2 className="font-bold mb-3 text-sm" style={{ color: T.gold }}>
            Por jugar ({pendientes.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            {pendientes.map((m) => (
              <div
                key={m.id}
                className="rounded-2xl border p-3 shadow-sm flex flex-col gap-2"
                style={{ background: T.panel, borderColor: T.line }}
              >
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => onDeclareWinner(m, m.team1_id)}
                    className="text-sm font-semibold text-right px-2 py-1.5 rounded-lg transition-colors duration-150 flex-1 truncate"
                    style={{ color: T.ink }}
                  >
                    {teamsById[m.team1_id]?.name}
                  </button>
                  <span className="text-xs flex-shrink-0" style={{ color: T.inkDim }}>
                    vs
                  </span>
                  <button
                    onClick={() => onDeclareWinner(m, m.team2_id)}
                    className="text-sm font-semibold text-left px-2 py-1.5 rounded-lg transition-colors duration-150 flex-1 truncate"
                    style={{ color: T.ink }}
                  >
                    {teamsById[m.team2_id]?.name}
                  </button>
                </div>
                <button
                  onClick={() => onOpenQr(m.match_token)}
                  className="mt-1 py-2 rounded-xl font-bold text-sm transition-all duration-200 hover:scale-105 active:scale-95"
                  style={{ background: T.gold, color: T.ink }}
                >
                  📱 Ver QR
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {jugados.length > 0 && (
        <>
          <h2 className="font-bold mb-3 text-sm" style={{ color: T.gold }}>
            Ya jugados ({jugados.length})
          </h2>
          <div className="flex flex-col gap-1.5">
            {jugados.map((m) => (
              <div
                key={m.id}
                className="px-3 py-2 rounded-xl text-sm"
                style={{ background: T.panelLight, color: T.inkDim }}
              >
                <span style={{ color: m.winner_id === m.team1_id ? T.goldBright : T.inkDim }}>
                  {teamsById[m.team1_id]?.name}
                </span>
                {" vs "}
                <span style={{ color: m.winner_id === m.team2_id ? T.goldBright : T.inkDim }}>
                  {teamsById[m.team2_id]?.name}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Igual que BracketDisplay pero agrega un botón "ver QR" en vez del link directo,
// para que el organizador lo pueda mostrar en pantalla o imprimir.
function BracketDisplayWithQr({ matches, teamsById, onOpenQr, onDeclareWinner, onReabrir }) {
  const { T } = useTheme();
  const [abiertoPendientes, setAbiertoPendientes] = useState(true);
  const [abiertoFinalizados, setAbiertoFinalizados] = useState(true);
  const conQr = matches.filter((m) => !m.bye && m.team1_id && m.team2_id && m.match_token);
  const pendientes = conQr.filter((m) => !m.winner_id);
  const finalizados = conQr.filter((m) => m.winner_id);

  const Fila = ({ m, clickable }) => (
    <div
      className="w-full text-left px-4 py-3 rounded-xl text-sm flex items-center justify-between gap-3 transition-colors duration-150"
      style={{
        background: clickable ? T.panel : T.panelLight,
        border: `1px solid ${T.line}`,
        opacity: clickable ? 1 : 0.85,
      }}
    >
      <button
        onClick={clickable ? () => onOpenQr(m.match_token) : undefined}
        className="flex-1 text-left truncate"
        style={{ cursor: clickable ? "pointer" : "default" }}
      >
        <span style={{ color: m.winner_id === m.team1_id ? T.goldBright : T.inkDim }}>
          {teamsById[m.team1_id]?.name}
          {!clickable && ` (${m.score_a ?? 0})`}
        </span>
        <span style={{ color: T.inkDim }}> vs </span>
        <span style={{ color: m.winner_id === m.team2_id ? T.goldBright : T.inkDim }}>
          {teamsById[m.team2_id]?.name}
          {!clickable && ` (${m.score_b ?? 0})`}
        </span>
      </button>
      {clickable ? (
        <button onClick={() => onOpenQr(m.match_token)} className="text-xs font-bold flex-shrink-0" style={{ color: T.goldBright }}>
          📱 ver QR
        </button>
      ) : (
        <button
          onClick={() => onReabrir(m)}
          className="text-xs font-bold flex-shrink-0 px-2 py-1 rounded-full"
          style={{ color: T.redDim, border: `1px solid ${T.redDim}` }}
          title="Reabrir este partido"
        >
          ↺ reabrir
        </button>
      )}
    </div>
  );

  return (
    <div className="[&_a]:hidden">
      <BracketDisplay matches={matches} teamsById={teamsById} adminMode onDeclareWinner={onDeclareWinner} />

      {pendientes.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setAbiertoPendientes((v) => !v)}
            className="w-full flex items-center justify-between mb-2"
          >
            <h3 className="text-xs font-bold uppercase tracking-wide" style={{ color: T.gold }}>
              Por jugar ({pendientes.length})
            </h3>
            <span className="text-xs" style={{ color: T.gold }}>
              {abiertoPendientes ? "▲" : "▼"}
            </span>
          </button>
          {abiertoPendientes && (
            <div className="flex flex-col gap-2">
              {pendientes.map((m) => (
                <Fila key={m.id} m={m} clickable />
              ))}
            </div>
          )}
        </div>
      )}

      {finalizados.length > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setAbiertoFinalizados((v) => !v)}
            className="w-full flex items-center justify-between mb-2"
          >
            <h3 className="text-xs font-bold uppercase tracking-wide" style={{ color: T.inkDim }}>
              Tanteadores partidos finalizados ({finalizados.length})
            </h3>
            <span className="text-xs" style={{ color: T.inkDim }}>
              {abiertoFinalizados ? "▲" : "▼"}
            </span>
          </button>
          {abiertoFinalizados && (
            <div className="flex flex-col gap-2">
              {finalizados.map((m) => (
                <Fila key={m.id} m={m} clickable={false} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
