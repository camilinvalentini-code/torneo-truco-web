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
  const [newPlayers, setNewPlayers] = useState("");
  const [error, setError] = useState("");
  const [origin, setOrigin] = useState("");
  const [qrTarget, setQrTarget] = useState(null); // match_token abierto en el modal de QR
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [editandoInfo, setEditandoInfo] = useState(false);
  const [infoNombre, setInfoNombre] = useState("");
  const [infoUbicacion, setInfoUbicacion] = useState("");
  const [infoFecha, setInfoFecha] = useState("");

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
    setTournament(t);
    setTeams(ts || []);
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

  async function addTeam() {
    const name = newName.trim();
    if (!name) return;
    const dup = teams.some((t) => t.name.trim().toLowerCase() === name.toLowerCase());
    if (dup) {
      setError(`Ya hay un equipo anotado como "${name}".`);
      return;
    }
    setError("");
    const { error: err } = await supabase
      .from("teams")
      .insert({ tournament_id: id, name, players: newPlayers.trim(), paid: false });
    if (err) {
      setError("No se pudo agregar el equipo.");
      return;
    }
    setNewName("");
    setNewPlayers("");
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

  async function forzarGanador(match, winnerId) {
    const nombreEquipo = teamsById[winnerId]?.name || "este equipo";
    if (!window.confirm(`¿Marcar a "${nombreEquipo}" como ganador de este partido?`)) return;
    await supabase.rpc("declarar_ganador", { p_match_id: match.id, p_winner_id: winnerId });
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
            ← mi panel
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
            ✏️ editar datos
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
                    placeholder="Nombre del equipo"
                    className="px-3 py-2 rounded-xl text-sm"
                    style={{ background: T.bg, color: T.ink, border: `1px solid ${T.line}` }}
                  />
                  <input
                    value={newPlayers}
                    onChange={(e) => setNewPlayers(e.target.value)}
                    placeholder="Jugadores (opcional)"
                    className="px-3 py-2 rounded-xl text-sm"
                    style={{ background: T.bg, color: T.ink, border: `1px solid ${T.line}` }}
                  />
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
                🎴 Hacer el sorteo
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="rounded-2xl p-4 mb-4 border shadow-sm" style={{ background: T.panel, borderColor: T.line }}>
              <h2 className="font-bold mb-2" style={{ color: T.gold }}>
                Equipos y pagos
              </h2>
              <TeamList teams={teams} onTogglePaid={togglePaid} twoColumns />
            </div>

            <h2 className="font-bold mb-3" style={{ color: T.gold }}>
              Cuadro principal — tocá un equipo para forzar el resultado, o "abrir anotador" para el QR de esa mesa
            </h2>
            <div className="mb-2">
              <BracketDisplayWithQr
                matches={mainMatches}
                teamsById={teamsById}
                origin={origin}
                onOpenQr={openQr}
                onDeclareWinner={forzarGanador}
              />
            </div>

            {tournament.repechaje && repMatches.length > 0 && (
              <div className="mt-6">
                <h2 className="font-bold mb-3" style={{ color: T.gold }}>
                  Cuadro de repechaje
                </h2>
                <BracketDisplayWithQr
                  matches={repMatches}
                  teamsById={teamsById}
                  origin={origin}
                  onOpenQr={openQr}
                  onDeclareWinner={forzarGanador}
                />
              </div>
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

// Igual que BracketDisplay pero agrega un botón "ver QR" en vez del link directo,
// para que el organizador lo pueda mostrar en pantalla o imprimir.
function BracketDisplayWithQr({ matches, teamsById, onOpenQr, onDeclareWinner }) {
  const { T } = useTheme();
  return (
    <div className="[&_a]:hidden">
      <BracketDisplay matches={matches} teamsById={teamsById} adminMode onDeclareWinner={onDeclareWinner} />
      <div className="flex flex-col gap-2 mt-3">
        {matches
          .filter((m) => !m.bye && m.team1_id && m.team2_id && m.match_token)
          .map((m) => (
            <button
              key={m.id}
              onClick={() => onOpenQr(m.match_token)}
              className="text-xs underline text-left"
              style={{ color: T.goldBright }}
            >
              ver QR: {teamsById[m.team1_id]?.name} vs {teamsById[m.team2_id]?.name}
              {m.winner_id ? " (ya jugado)" : ""}
            </button>
          ))}
      </div>
    </div>
  );
}
