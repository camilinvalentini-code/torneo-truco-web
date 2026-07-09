"use client";
import React, { useEffect, useState, useCallback } from "react";
import QRCode from "qrcode";
import { useTheme } from "../../../../lib/theme";
import { supabase } from "../../../../lib/supabaseClient";
import { buildMatchRows } from "../../../../lib/bracket";
import TeamList from "../../../../components/TeamList";
import BracketDisplay from "../../../../components/BracketDisplay";
import ThemeToggleButton from "../../../../components/ThemeToggleButton";
import SuitIcon from "../../../../components/SuitIcon";

export default function AdminPage({ params, searchParams }) {
  const { id } = params;
  const key = searchParams?.key;
  const { T } = useTheme();

  const [tournament, setTournament] = useState(null);
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);

  const [newName, setNewName] = useState("");
  const [newPlayers, setNewPlayers] = useState("");
  const [error, setError] = useState("");
  const [origin, setOrigin] = useState("");
  const [qrTarget, setQrTarget] = useState(null); // match_token abierto en el modal de QR
  const [qrDataUrl, setQrDataUrl] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  const load = useCallback(async () => {
    const { data: t } = await supabase.from("tournaments").select("*").eq("id", id).single();
    if (!t) {
      setLoading(false);
      return;
    }
    if (t.admin_token !== key) {
      setUnauthorized(true);
      setLoading(false);
      return;
    }
    const { data: ts } = await supabase.from("teams").select("*").eq("tournament_id", id).order("created_at");
    const { data: ms } = await supabase.from("matches").select("*").eq("tournament_id", id);
    setTournament(t);
    setTeams(ts || []);
    setMatches(ms || []);
    setLoading(false);
  }, [id, key]);

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
    const rows = buildMatchRows({ tournamentId: id, bracket: "main", teamIds: teams.map((t) => t.id) });
    await supabase.from("matches").insert(rows);
    await supabase.from("tournaments").update({ started: true }).eq("id", id);
    load();
  }

  async function openQr(token) {
    const url = `${origin}/partido/${token}`;
    const dataUrl = await QRCode.toDataURL(url, { margin: 1, width: 260, color: { dark: "#33453E", light: "#FBF3E3" } });
    setQrTarget(token);
    setQrDataUrl(dataUrl);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: T.bg, color: T.ink }}>
        Cargando…
      </div>
    );
  }
  if (unauthorized || !tournament) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-6" style={{ background: T.bg, color: T.ink }}>
        No podés administrar este torneo con ese link. Fijate que copiaste la URL completa (incluyendo lo que va después de "?key=").
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
        <div className="flex justify-end mb-2">
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
        </p>
        {origin && (
          <p className="text-center text-xs mb-5 break-all">
            <a href={publicUrl} target="_blank" rel="noreferrer" className="underline" style={{ color: T.goldBright }}>
              link público del cuadro: {publicUrl}
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
            <div className="rounded-2xl p-4 mb-4 border shadow-sm lg:max-w-md" style={{ background: T.panel, borderColor: T.line }}>
              <h2 className="font-bold mb-2" style={{ color: T.gold }}>
                Equipos y pagos
              </h2>
              <TeamList teams={teams} onTogglePaid={togglePaid} />
            </div>

            <h2 className="font-bold mb-3" style={{ color: T.gold }}>
              Cuadro principal — tocá "abrir anotador" para ver el QR de cada mesa
            </h2>
            <div className="mb-2">
              <BracketDisplayWithQr
                matches={mainMatches}
                teamsById={teamsById}
                origin={origin}
                onOpenQr={openQr}
              />
            </div>

            {tournament.repechaje && repMatches.length > 0 && (
              <div className="mt-6">
                <h2 className="font-bold mb-3" style={{ color: T.gold }}>
                  Cuadro de repechaje
                </h2>
                <BracketDisplayWithQr matches={repMatches} teamsById={teamsById} origin={origin} onOpenQr={openQr} />
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
function BracketDisplayWithQr({ matches, teamsById, onOpenQr }) {
  const { T } = useTheme();
  return (
    <div className="[&_a]:hidden">
      <BracketDisplay matches={matches} teamsById={teamsById} />
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
