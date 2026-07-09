import React, { useState, useEffect, useCallback, useContext, createContext } from "react";

/* ---------- themes ---------- */
const LIGHT = {
  bg: "#EAF3EC",
  panel: "#FFFFFF",
  panelLight: "#F1F7F1",
  ink: "#33453E",
  inkDim: "#84958C",
  gold: "#EAC27A",
  goldBright: "#C6902E",
  red: "#D98A82",
  redDim: "#B85C55",
  line: "#DCEAE0",
};
const DARK = {
  bg: "#152420",
  panel: "#1E332B",
  panelLight: "#26392F",
  ink: "#EDE6D6",
  inkDim: "#93A69B",
  gold: "#E3B563",
  goldBright: "#F2CE87",
  red: "#D98A82",
  redDim: "#E8A39B",
  line: "#334A3F",
};
// texto siempre oscuro sobre superficies claras fijas (botón dorado, ficha campeón), sin importar el tema
const INK_ON_LIGHT = "#33453E";
const BANNER = { bg: "#FBF3E3", ink: "#33453E", accent: "#B85C55" };
const ThemeCtx = createContext(LIGHT);

/* ---------- helpers ---------- */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function nextPow2(n) {
  let p = 2;
  while (p < n) p *= 2;
  return p;
}
function roundLabel(numMatches) {
  const map = {
    1: "Final",
    2: "Semifinal",
    4: "Cuartos de Final",
    8: "Octavos de Final",
    16: "Dieciseisavos de Final",
  };
  return map[numMatches] || `Ronda de ${numMatches * 2}`;
}
function propagateWinner(rounds, roundIdx, matchIdx, winnerId) {
  if (roundIdx + 1 >= rounds.length) return;
  const nextIdx = Math.floor(matchIdx / 2);
  const slot = matchIdx % 2 === 0 ? "team1" : "team2";
  rounds[roundIdx + 1][nextIdx][slot] = winnerId;
}
function buildFullBracket(teamIds) {
  const n = teamIds.length;
  const size = nextPow2(n);
  const numMatches0 = size / 2;
  const byes = size - n; // siempre < numMatches0, nunca se pisan dos "libres" en la misma llave
  const shuffledTeams = shuffle(teamIds);
  const matchSizes = shuffle([
    ...Array(byes).fill(1),
    ...Array(numMatches0 - byes).fill(2),
  ]);
  let idx = 0;
  const round0 = matchSizes.map((sz) => {
    const team1 = shuffledTeams[idx++];
    const team2 = sz === 2 ? shuffledTeams[idx++] : null;
    return { id: uid(), team1, team2, winner: null, bye: sz === 1 };
  });

  const numRounds = Math.log2(size);
  const rounds = [round0];
  for (let r = 1; r < numRounds; r++) {
    const numMatches = size / Math.pow(2, r + 1);
    const matches = [];
    for (let i = 0; i < numMatches; i++) {
      matches.push({ id: uid(), team1: null, team2: null, winner: null, bye: false });
    }
    rounds.push(matches);
  }
  round0.forEach((m, idx2) => {
    if (m.team1 === null || m.team2 === null) {
      const winner = m.team1 === null ? m.team2 : m.team1;
      if (winner) {
        m.winner = winner;
        propagateWinner(rounds, 0, idx2, winner);
      }
    }
  });
  return rounds;
}
function attemptUndo(rounds, roundIdx, matchIdx) {
  const cloned = JSON.parse(JSON.stringify(rounds));
  const m = cloned[roundIdx][matchIdx];
  if (m.bye) return null;
  if (roundIdx + 1 < cloned.length) {
    const next = cloned[roundIdx + 1][Math.floor(matchIdx / 2)];
    if (next.winner) return null;
    const slot = matchIdx % 2 === 0 ? "team1" : "team2";
    next[slot] = null;
  }
  m.winner = null;
  return cloned;
}
function getEmptyCategory() {
  return {
    info: { nombre: "", ubicacion: "", fecha: "" },
    teams: [],
    repechaje: false,
    started: false,
    rounds: null,
    repechajeRounds: null,
    champion: null,
    repechajeChampion: null,
  };
}
function normName(s) {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/* ---------- suit icons (decorative) ---------- */
function SuitIcon({ suit, size = 16, color }) {
  const T = useContext(ThemeCtx);
  const c = color || T.gold;
  const s = size;
  if (suit === "oro")
    return (
      <svg width={s} height={s} viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="7.5" stroke={c} strokeWidth="1.6" />
        <circle cx="10" cy="10" r="3.2" stroke={c} strokeWidth="1.3" />
      </svg>
    );
  if (suit === "copa")
    return (
      <svg width={s} height={s} viewBox="0 0 20 20" fill="none">
        <path
          d="M4 3H16L13.2 10.5C12.5 12.3 11 13 10 13C9 13 7.5 12.3 6.8 10.5L4 3Z"
          stroke={c}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <line x1="10" y1="13" x2="10" y2="16.5" stroke={c} strokeWidth="1.5" />
        <line x1="6.5" y1="17.5" x2="13.5" y2="17.5" stroke={c} strokeWidth="1.5" />
      </svg>
    );
  if (suit === "espada")
    return (
      <svg width={s} height={s} viewBox="0 0 20 20" fill="none">
        <line x1="10" y1="2" x2="10" y2="14" stroke={c} strokeWidth="1.6" />
        <line x1="5.5" y1="6" x2="14.5" y2="6" stroke={c} strokeWidth="1.6" />
        <path d="M8 14H12L10 18L8 14Z" fill={c} />
      </svg>
    );
  return (
    <svg width={s} height={s} viewBox="0 0 20 20" fill="none">
      <line x1="5" y1="16" x2="15" y2="4" stroke={c} strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="6" cy="15" r="2.1" fill={c} />
      <circle cx="14" cy="5" r="2.1" fill={c} />
    </svg>
  );
}
const SUITS = ["espada", "basto", "oro", "copa"];

/* ---------- Match card (sin puntaje: solo se toca al ganador) ---------- */
function MatchCard({ match, nameOf, onDeclare, onUndo, canUndo }) {
  const T = useContext(ThemeCtx);
  const decided = !!match.winner;
  const playable = !decided && match.team1 && match.team2 && !match.bye;
  const t1 = match.team1 ? nameOf(match.team1) : match.bye ? "—" : "Por definir";
  const t2 = match.team2 ? nameOf(match.team2) : match.bye ? "LIBRE" : "Por definir";

  const Row = ({ label, teamId }) => {
    const isWinner = decided && match.winner === teamId;
    const isLoser = decided && match.winner && match.winner !== teamId && teamId;
    return (
      <button
        onClick={() => playable && teamId && onDeclare(teamId)}
        disabled={!playable}
        className="w-full text-left px-3 py-2 rounded-xl flex items-center justify-between gap-2 transition-all duration-200"
        style={{
          background: isWinner ? "rgba(234,194,122,0.35)" : "transparent",
          cursor: playable ? "pointer" : "default",
        }}
        onMouseEnter={(e) => {
          if (playable) e.currentTarget.style.background = "rgba(120,120,120,0.08)";
        }}
        onMouseLeave={(e) => {
          if (playable) e.currentTarget.style.background = "transparent";
        }}
      >
        <span
          className="text-sm sm:text-base font-semibold truncate"
          style={{
            color: isWinner ? T.goldBright : isLoser ? T.inkDim : T.ink,
            opacity: isLoser ? 0.5 : 1,
            textDecoration: isLoser ? "line-through" : "none",
          }}
        >
          {label}
        </span>
        {isWinner && <SuitIcon suit="espada" size={14} color={T.goldBright} />}
      </button>
    );
  };

  return (
    <div
      className="rounded-2xl border p-2 mb-4 shadow-sm transition-all duration-300"
      style={{
        background: T.panel,
        borderColor: match.bye ? T.line : decided ? T.gold : T.line,
        opacity: match.bye ? 0.65 : 1,
      }}
    >
      <Row label={t1} teamId={match.team1} />
      <div className="h-px my-1" style={{ background: T.line }} />
      <Row label={t2} teamId={match.team2} />

      {match.bye && (
        <div className="text-xs text-center mt-1" style={{ color: T.inkDim }}>
          Pasa libre de ronda
        </div>
      )}
      {playable && (
        <div className="text-xs text-center mt-1" style={{ color: T.inkDim }}>
          Tocá el equipo ganador
        </div>
      )}
      {decided && !match.bye && canUndo && (
        <div className="text-right mt-1">
          <button onClick={onUndo} className="text-xs underline" style={{ color: T.inkDim }}>
            Deshacer
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------- Bracket columns ---------- */
function Bracket({ rounds, nameOf, onDeclare, onUndo, lockedFirstRound }) {
  const T = useContext(ThemeCtx);
  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {rounds.map((round, rIdx) => (
        <div key={rIdx} className="flex-shrink-0 w-56">
          <div className="flex items-center gap-2 mb-3 justify-center">
            <SuitIcon suit={SUITS[rIdx % 4]} size={15} />
            <h3 className="text-xs font-bold uppercase tracking-wide" style={{ color: T.gold }}>
              {roundLabel(round.length)}
            </h3>
          </div>
          <div className="flex flex-col justify-around h-full">
            {round.map((m, mIdx) => (
              <MatchCard
                key={m.id}
                match={m}
                nameOf={nameOf}
                canUndo={!(rIdx === 0 && lockedFirstRound)}
                onDeclare={(winnerId) => onDeclare(rIdx, mIdx, winnerId)}
                onUndo={() => onUndo(rIdx, mIdx)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- Champion banner (siempre igual, como una ficha impresa) ---------- */
function ChampionBanner({ name, sub }) {
  return (
    <div
      className="rounded-3xl p-5 mb-5 text-center border-2 shadow-md transition-all duration-500"
      style={{ background: BANNER.bg, borderColor: "#EAC27A" }}
    >
      <div className="flex justify-center mb-1">
        <SuitIcon suit="espada" size={30} color={BANNER.ink} />
      </div>
      <div className="text-xs font-bold uppercase tracking-widest" style={{ color: BANNER.accent }}>
        {sub}
      </div>
      <div className="text-2xl font-black mt-1" style={{ color: BANNER.ink }}>
        {name}
      </div>
      <div className="text-xs mt-1 italic" style={{ color: BANNER.accent }}>
        Como el Ancho de Espada: no hay quien les gane
      </div>
    </div>
  );
}

/* ---------- Lista de equipos (se usa antes y después del sorteo) ---------- */
function TeamList({ teams, editable, onTogglePaid, onRemove }) {
  const T = useContext(ThemeCtx);
  return (
    <div className="flex flex-col gap-2">
      {teams.map((t) => (
        <div
          key={t.id}
          className="flex items-center gap-2 px-3 py-2 rounded-xl transition-colors duration-200"
          style={{ background: T.panelLight }}
        >
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate" style={{ color: T.ink }}>
              {t.name}
            </div>
            {t.players && (
              <div className="text-xs truncate" style={{ color: T.inkDim }}>
                {t.players}
              </div>
            )}
          </div>
          <button
            onClick={() => onTogglePaid(t.id)}
            className="text-xs px-2 py-1 rounded-full font-bold transition-colors duration-200"
            style={{
              background: t.paid ? T.gold : "transparent",
              color: t.paid ? INK_ON_LIGHT : T.inkDim,
              border: `1px solid ${T.gold}`,
            }}
          >
            {t.paid ? "Pagó" : "Debe"}
          </button>
          {editable && onRemove && (
            <button onClick={() => onRemove(t.id)} className="text-xs px-2" style={{ color: T.redDim }}>
              Quitar
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

/* ---------- Main App ---------- */
export default function TorneoApp() {
  const [theme, setTheme] = useState("light");
  const [data, setData] = useState({ "2v2": getEmptyCategory(), "3v3": getEmptyCategory() });
  const [activeCat, setActiveCat] = useState("2v2");
  const [loading, setLoading] = useState(true);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamPlayers, setNewTeamPlayers] = useState("");
  const [newTeamPaid, setNewTeamPaid] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [error, setError] = useState("");
  const [showTeams, setShowTeams] = useState(false);
  const [showHistorial, setShowHistorial] = useState(false);
  const [historial, setHistorial] = useState([]);

  const T = theme === "dark" ? DARK : LIGHT;

  const loadCategory = useCallback(async (cat) => {
    try {
      const res = await window.storage.get(`torneo-${cat}`, false);
      if (res && res.value) {
        const parsed = JSON.parse(res.value);
        if (!parsed.info) parsed.info = { nombre: "", ubicacion: "", fecha: "" };
        setData((d) => ({ ...d, [cat]: parsed }));
      }
    } catch (e) {
      /* todavía no hay datos para esta categoría */
    }
  }, []);

  useEffect(() => {
    async function boot() {
      await Promise.all([loadCategory("2v2"), loadCategory("3v3")]);
      try {
        const res = await window.storage.get("torneo-theme", false);
        if (res && res.value) setTheme(JSON.parse(res.value).theme);
      } catch (e) {
        /* sin preferencia guardada todavía */
      }
      try {
        const res = await window.storage.get("torneo-historial", false);
        if (res && res.value) setHistorial(JSON.parse(res.value));
      } catch (e) {
        /* todavía no hay historial */
      }
      setLoading(false);
    }
    boot();
  }, [loadCategory]);

  async function saveCategory(cat, updated) {
    setData((d) => ({ ...d, [cat]: updated }));
    try {
      await window.storage.set(`torneo-${cat}`, JSON.stringify(updated), false);
    } catch (e) {
      console.error("no se pudo guardar", e);
    }
  }
  async function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    try {
      await window.storage.set("torneo-theme", JSON.stringify({ theme: next }), false);
    } catch (e) {
      console.error("no se pudo guardar el tema", e);
    }
  }
  async function logChampion(cat, catData, winnerId) {
    const entry = {
      id: uid(),
      torneo: catData.info.nombre.trim() || "(torneo sin nombre)",
      ubicacion: catData.info.ubicacion.trim(),
      fecha: catData.info.fecha.trim(),
      categoria: cat,
      campeon: catData.teams.find((t) => t.id === winnerId)?.name || "???",
      registrado: new Date().toISOString(),
    };
    const next = [entry, ...historial];
    setHistorial(next);
    try {
      await window.storage.set("torneo-historial", JSON.stringify(next), false);
    } catch (e) {
      console.error("no se pudo guardar el historial", e);
    }
  }
  function updateInfo(field, value) {
    saveCategory(activeCat, { ...cur, info: { ...cur.info, [field]: value } });
  }
  function setFechaHoy() {
    const hoy = new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
    updateInfo("fecha", hoy);
  }

  const cur = data[activeCat];
  const nameOf = (id) => cur.teams.find((t) => t.id === id)?.name || "???";

  function addTeam() {
    const name = newTeamName.trim();
    if (!name) return;
    const dup = cur.teams.some((t) => normName(t.name) === normName(name));
    if (dup) {
      setError(`Ya hay un equipo anotado como "${name}".`);
      return;
    }
    setError("");
    const team = { id: uid(), name, players: newTeamPlayers.trim(), paid: newTeamPaid };
    saveCategory(activeCat, { ...cur, teams: [...cur.teams, team] });
    setNewTeamName("");
    setNewTeamPlayers("");
    setNewTeamPaid(false);
  }
  function removeTeam(id) {
    if (cur.started) return;
    saveCategory(activeCat, { ...cur, teams: cur.teams.filter((t) => t.id !== id) });
  }
  function togglePaid(id) {
    saveCategory(activeCat, {
      ...cur,
      teams: cur.teams.map((t) => (t.id === id ? { ...t, paid: !t.paid } : t)),
    });
  }
  function toggleRepechaje() {
    if (cur.started) return;
    saveCategory(activeCat, { ...cur, repechaje: !cur.repechaje });
  }
  function doSorteo() {
    if (cur.teams.length < 3) {
      setError("Necesitás al menos 3 equipos anotados para hacer el sorteo.");
      return;
    }
    setError("");
    const rounds = buildFullBracket(cur.teams.map((t) => t.id));
    saveCategory(activeCat, {
      ...cur,
      started: true,
      rounds,
      repechajeRounds: null,
      champion: null,
      repechajeChampion: null,
    });
  }
  function firstRoundUntouched() {
    if (!cur.rounds) return true;
    return cur.rounds[0].every((m) => !m.winner || m.bye);
  }
  function redoSorteo() {
    if (!firstRoundUntouched()) return;
    doSorteo();
  }
  function backToSetup() {
    if (!firstRoundUntouched()) return;
    saveCategory(activeCat, { ...cur, started: false, rounds: null, repechajeRounds: null, champion: null });
  }
  function resetAll() {
    saveCategory(activeCat, getEmptyCategory());
    setConfirmReset(false);
  }

  function declareMain(roundIdx, matchIdx, winnerId) {
    const rounds = JSON.parse(JSON.stringify(cur.rounds));
    const m = rounds[roundIdx][matchIdx];
    m.winner = winnerId;
    propagateWinner(rounds, roundIdx, matchIdx, winnerId);
    let champion = cur.champion;
    const isNewChampion = roundIdx === rounds.length - 1 && !cur.champion;
    if (roundIdx === rounds.length - 1) champion = winnerId;

    let updated = { ...cur, rounds, champion };

    if (cur.repechaje && roundIdx === 0 && !cur.repechajeRounds) {
      const allDone = rounds[0].every((mm) => mm.winner);
      if (allDone) {
        const losers = rounds[0]
          .filter((mm) => !mm.bye)
          .map((mm) => (mm.team1 === mm.winner ? mm.team2 : mm.team1));
        if (losers.length >= 2) updated.repechajeRounds = buildFullBracket(losers);
        else if (losers.length === 1) updated.repechajeChampion = losers[0];
      }
    }
    saveCategory(activeCat, updated);
    if (isNewChampion) logChampion(activeCat, cur, winnerId);
  }
  function undoMain(roundIdx, matchIdx) {
    if (roundIdx === 0 && cur.repechajeRounds) return;
    const rounds = attemptUndo(cur.rounds, roundIdx, matchIdx);
    if (!rounds) return;
    let champion = cur.champion;
    if (roundIdx === cur.rounds.length - 1) champion = null;
    saveCategory(activeCat, { ...cur, rounds, champion });
  }
  function declareRepechaje(roundIdx, matchIdx, winnerId) {
    const rounds = JSON.parse(JSON.stringify(cur.repechajeRounds));
    const m = rounds[roundIdx][matchIdx];
    m.winner = winnerId;
    propagateWinner(rounds, roundIdx, matchIdx, winnerId);
    let repechajeChampion = cur.repechajeChampion;
    if (roundIdx === rounds.length - 1) repechajeChampion = winnerId;
    saveCategory(activeCat, { ...cur, repechajeRounds: rounds, repechajeChampion });
  }
  function undoRepechaje(roundIdx, matchIdx) {
    const rounds = attemptUndo(cur.repechajeRounds, roundIdx, matchIdx);
    if (!rounds) return;
    let repechajeChampion = cur.repechajeChampion;
    if (roundIdx === cur.repechajeRounds.length - 1) repechajeChampion = null;
    saveCategory(activeCat, { ...cur, repechajeRounds: rounds, repechajeChampion });
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: T.bg, color: T.ink }}>
        Cargando el mazo…
      </div>
    );
  }

  return (
    <ThemeCtx.Provider value={T}>
      <div className="min-h-screen transition-colors duration-500" style={{ background: T.bg }}>
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="flex justify-end gap-2 mb-2">
            <button
              onClick={() => setShowHistorial((s) => !s)}
              className="text-xs px-3 py-1.5 rounded-full font-bold transition-all duration-200 hover:scale-105 active:scale-95"
              style={{ background: T.panel, color: T.ink, border: `1px solid ${T.line}` }}
            >
              🏆 Historial
            </button>
            <button
              onClick={toggleTheme}
              className="text-xs px-3 py-1.5 rounded-full font-bold transition-all duration-200 hover:scale-105 active:scale-95"
              style={{ background: T.panel, color: T.ink, border: `1px solid ${T.line}` }}
            >
              {theme === "dark" ? "☀️ Modo día" : "🌙 Modo oscuro"}
            </button>
          </div>

          {showHistorial && (
            <div
              className="rounded-2xl p-4 mb-4 border shadow-sm"
              style={{ background: T.panel, borderColor: T.line }}
            >
              <h2 className="font-bold mb-2" style={{ color: T.gold }}>
                Historial de campeones
              </h2>
              {historial.length === 0 ? (
                <p className="text-sm" style={{ color: T.inkDim }}>
                  Todavía no se coronó ningún campeón.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {historial.map((h) => (
                    <div
                      key={h.id}
                      className="px-3 py-2 rounded-xl"
                      style={{ background: T.panelLight }}
                    >
                      <div className="text-sm font-bold" style={{ color: T.ink }}>
                        {h.campeon} <span style={{ color: T.inkDim, fontWeight: "normal" }}>({h.categoria})</span>
                      </div>
                      <div className="text-xs" style={{ color: T.inkDim }}>
                        {h.torneo}
                        {h.ubicacion && ` — ${h.ubicacion}`}
                        {h.fecha && ` — ${h.fecha}`}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 justify-center mb-1">
            <SuitIcon suit="espada" size={20} />
            <SuitIcon suit="basto" size={20} />
            <SuitIcon suit="oro" size={20} />
            <SuitIcon suit="copa" size={20} />
          </div>
          <h1
            className="text-3xl font-black text-center tracking-tight"
            style={{ color: T.ink, fontFamily: "Georgia, serif" }}
          >
            Torneo de Truco
          </h1>
          <p className="text-center text-sm mb-1" style={{ color: T.inkDim }}>
            Armá el cuadro, sorteá y cargá los resultados
          </p>
          {(cur.info.nombre || cur.info.ubicacion || cur.info.fecha) && (
            <p className="text-center text-sm mb-5 font-semibold" style={{ color: T.goldBright }}>
              {[cur.info.nombre, cur.info.ubicacion, cur.info.fecha].filter(Boolean).join(" · ")}
            </p>
          )}

          {/* category tabs */}
          <div className="flex rounded-2xl overflow-hidden border mb-5 shadow-sm" style={{ borderColor: T.gold }}>
            {["2v2", "3v3"].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCat(cat)}
                className="flex-1 py-2 text-sm font-bold uppercase tracking-wide transition-colors duration-300"
                style={{
                  background: activeCat === cat ? T.gold : "transparent",
                  color: activeCat === cat ? INK_ON_LIGHT : T.inkDim,
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* SETUP VIEW */}
          {!cur.started && (
            <div>
              <div
                className="rounded-2xl p-4 mb-4 border shadow-sm transition-shadow duration-300 hover:shadow-md"
                style={{ background: T.panel, borderColor: T.line }}
              >
                <h2 className="font-bold mb-3" style={{ color: T.gold }}>
                  Datos del torneo
                </h2>
                <div className="flex flex-col gap-2">
                  <input
                    value={cur.info.nombre}
                    onChange={(e) => updateInfo("nombre", e.target.value)}
                    placeholder="Nombre del torneo (ej: Torneo Lunes 13/7)"
                    className="px-3 py-2 rounded-xl text-sm transition-colors duration-200"
                    style={{ background: T.bg, color: T.ink, border: `1px solid ${T.line}` }}
                  />
                  <input
                    value={cur.info.ubicacion}
                    onChange={(e) => updateInfo("ubicacion", e.target.value)}
                    placeholder="Ubicación (ej: Córdoba, Vidon Bar, Achával)"
                    className="px-3 py-2 rounded-xl text-sm transition-colors duration-200"
                    style={{ background: T.bg, color: T.ink, border: `1px solid ${T.line}` }}
                  />
                  <div className="flex gap-2">
                    <input
                      value={cur.info.fecha}
                      onChange={(e) => updateInfo("fecha", e.target.value)}
                      placeholder="Fecha (ej: 13/07/2026)"
                      className="flex-1 px-3 py-2 rounded-xl text-sm transition-colors duration-200"
                      style={{ background: T.bg, color: T.ink, border: `1px solid ${T.line}` }}
                    />
                    <button
                      onClick={setFechaHoy}
                      className="px-3 py-2 rounded-xl text-sm font-bold transition-all duration-200 hover:scale-105 active:scale-95"
                      style={{ background: T.panelLight, color: T.ink, border: `1px solid ${T.line}` }}
                    >
                      Hoy
                    </button>
                  </div>
                </div>
              </div>

              <div
                className="rounded-2xl p-4 mb-4 border shadow-sm transition-shadow duration-300 hover:shadow-md"
                style={{ background: T.panel, borderColor: T.line }}
              >
                <h2 className="font-bold mb-3" style={{ color: T.gold }}>
                  Anotar equipo
                </h2>
                <div className="flex flex-col gap-2">
                  <input
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    placeholder="Nombre del equipo"
                    className="px-3 py-2 rounded-xl text-sm transition-colors duration-200"
                    style={{ background: T.bg, color: T.ink, border: `1px solid ${T.line}` }}
                  />
                  <input
                    value={newTeamPlayers}
                    onChange={(e) => setNewTeamPlayers(e.target.value)}
                    placeholder="Jugadores (opcional)"
                    className="px-3 py-2 rounded-xl text-sm transition-colors duration-200"
                    style={{ background: T.bg, color: T.ink, border: `1px solid ${T.line}` }}
                  />
                  <label className="flex items-center gap-2 text-sm" style={{ color: T.inkDim }}>
                    <input type="checkbox" checked={newTeamPaid} onChange={(e) => setNewTeamPaid(e.target.checked)} />
                    Ya abonó la inscripción
                  </label>
                  <button
                    onClick={addTeam}
                    className="py-2 rounded-xl font-bold text-sm transition-all duration-200 hover:scale-105 active:scale-95"
                    style={{ background: T.gold, color: INK_ON_LIGHT }}
                  >
                    + Agregar equipo
                  </button>
                </div>
              </div>

              {cur.teams.length > 0 && (
                <div
                  className="rounded-2xl p-4 mb-4 border shadow-sm transition-shadow duration-300 hover:shadow-md"
                  style={{ background: T.panel, borderColor: T.line }}
                >
                  <h2 className="font-bold mb-3" style={{ color: T.gold }}>
                    Equipos anotados ({cur.teams.length})
                  </h2>
                  <TeamList teams={cur.teams} editable onTogglePaid={togglePaid} onRemove={removeTeam} />
                </div>
              )}

              <div
                className="rounded-2xl p-4 mb-4 border shadow-sm transition-shadow duration-300 hover:shadow-md"
                style={{ background: T.panel, borderColor: T.line }}
              >
                <label className="flex items-center gap-2 text-sm" style={{ color: T.ink }}>
                  <input type="checkbox" checked={cur.repechaje} onChange={toggleRepechaje} />
                  <span>
                    <strong>Con repechaje</strong>: los equipos que pierden en la primera ronda juegan su propio
                    cuadro aparte para salir campeón del repechaje
                  </span>
                </label>
              </div>

              {error && (
                <div className="text-sm text-center mb-3" style={{ color: T.goldBright }}>
                  {error}
                </div>
              )}

              <button
                onClick={doSorteo}
                disabled={cur.teams.length < 3}
                className="w-full py-3 rounded-2xl font-black text-lg transition-all duration-200 hover:scale-105 active:scale-95"
                style={{
                  background: cur.teams.length < 3 ? T.panelLight : T.gold,
                  color: cur.teams.length < 3 ? T.inkDim : INK_ON_LIGHT,
                }}
              >
                🎴 Hacer el sorteo
              </button>
            </div>
          )}

          {/* BRACKET VIEW */}
          {cur.started && cur.rounds && (
            <div>
              {cur.champion && <ChampionBanner name={nameOf(cur.champion)} sub={`Campeón ${activeCat}`} />}

              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <h2 className="font-bold" style={{ color: T.gold }}>
                  Cuadro principal
                </h2>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowTeams((s) => !s)}
                    className="text-xs underline"
                    style={{ color: T.inkDim }}
                  >
                    {showTeams ? "ocultar equipos" : "ver equipos / pagos"}
                  </button>
                  {firstRoundUntouched() && (
                    <>
                      <button onClick={redoSorteo} className="text-xs underline" style={{ color: T.inkDim }}>
                        resortear
                      </button>
                      <button onClick={backToSetup} className="text-xs underline" style={{ color: T.inkDim }}>
                        volver a anotar equipos
                      </button>
                    </>
                  )}
                </div>
              </div>

              {showTeams && (
                <div
                  className="rounded-2xl p-4 mb-4 border shadow-sm"
                  style={{ background: T.panel, borderColor: T.line }}
                >
                  <p className="text-xs mb-2" style={{ color: T.inkDim }}>
                    Podés seguir marcando quién pagó, aunque el torneo ya haya arrancado.
                  </p>
                  <TeamList teams={cur.teams} editable={false} onTogglePaid={togglePaid} />
                </div>
              )}

              <Bracket
                rounds={cur.rounds}
                nameOf={nameOf}
                onDeclare={declareMain}
                onUndo={undoMain}
                lockedFirstRound={!!cur.repechajeRounds}
              />

              {cur.repechaje && (
                <div className="mt-6">
                  {cur.repechajeChampion && (
                    <ChampionBanner name={nameOf(cur.repechajeChampion)} sub="Campeón del repechaje" />
                  )}
                  <h2 className="font-bold mb-3" style={{ color: T.gold }}>
                    Cuadro de repechaje
                  </h2>
                  {!cur.repechajeRounds && (
                    <p className="text-sm" style={{ color: T.inkDim }}>
                      Se arma solo apenas termine toda la primera ronda del cuadro principal.
                    </p>
                  )}
                  {cur.repechajeRounds && (
                    <Bracket
                      rounds={cur.repechajeRounds}
                      nameOf={nameOf}
                      onDeclare={declareRepechaje}
                      onUndo={undoRepechaje}
                      lockedFirstRound={false}
                    />
                  )}
                </div>
              )}

              <div className="mt-8 text-center">
                {!confirmReset ? (
                  <button
                    onClick={() => setConfirmReset(true)}
                    className="text-xs underline"
                    style={{ color: T.inkDim }}
                  >
                    reiniciar este torneo por completo
                  </button>
                ) : (
                  <div className="text-sm" style={{ color: T.ink }}>
                    ¿Seguro? Se van a borrar los equipos y resultados de {activeCat}.
                    <div className="flex gap-3 justify-center mt-2">
                      <button
                        onClick={resetAll}
                        className="px-3 py-1 rounded-xl font-bold text-xs transition-all duration-200 hover:scale-105 active:scale-95"
                        style={{ background: T.redDim, color: "#FFFFFF" }}
                      >
                        Sí, borrar todo
                      </button>
                      <button
                        onClick={() => setConfirmReset(false)}
                        className="px-3 py-1 rounded-xl font-bold text-xs transition-all duration-200 hover:scale-105 active:scale-95"
                        style={{ background: T.panelLight, color: T.ink }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </ThemeCtx.Provider>
  );
}
