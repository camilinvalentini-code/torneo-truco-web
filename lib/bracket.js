export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export function nextPow2(n) {
  let p = 2;
  while (p < n) p *= 2;
  return p;
}
export function roundLabel(numMatches) {
  const map = {
    1: "Final",
    2: "Semifinal",
    4: "Cuartos de Final",
    8: "Octavos de Final",
    16: "Dieciseisavos de Final",
  };
  return map[numMatches] || `Ronda de ${numMatches * 2}`;
}
function randomToken() {
  return (
    Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10)
  );
}

// Arma el esqueleto de partidos (round_index, match_index, team1/team2, byes)
// listo para insertar en Supabase. No pisa dos "libres" en la misma llave.
export function buildMatchRows({ tournamentId, bracket, teamIds }) {
  const n = teamIds.length;
  const size = nextPow2(n);
  const numMatches0 = size / 2;
  const byes = size - n;
  const shuffled = shuffle(teamIds);
  const matchSizes = shuffle([...Array(byes).fill(1), ...Array(numMatches0 - byes).fill(2)]);

  let idx = 0;
  const round0 = matchSizes.map((sz, i) => {
    const team1_id = shuffled[idx++];
    const team2_id = sz === 2 ? shuffled[idx++] : null;
    const isBye = sz === 1;
    return {
      tournament_id: tournamentId,
      bracket,
      round_index: 0,
      match_index: i,
      team1_id,
      team2_id,
      winner_id: isBye ? team1_id : null,
      bye: isBye,
      match_token: isBye ? null : randomToken(),
    };
  });

  const numRounds = Math.log2(size);
  const rows = [...round0];
  for (let r = 1; r < numRounds; r++) {
    const numMatches = size / Math.pow(2, r + 1);
    for (let i = 0; i < numMatches; i++) {
      rows.push({
        tournament_id: tournamentId,
        bracket,
        round_index: r,
        match_index: i,
        team1_id: null,
        team2_id: null,
        winner_id: null,
        bye: false,
        match_token: randomToken(),
      });
    }
  }

  // Propagar los byes de la ronda 0 a la ronda 1 (ya sabemos el "ganador" sin jugar)
  round0.forEach((m, i) => {
    if (m.bye && m.winner_id) {
      const nextIdx = Math.floor(i / 2);
      const slot = i % 2 === 0 ? "team1_id" : "team2_id";
      const target = rows.find((r) => r.round_index === 1 && r.match_index === nextIdx);
      if (target) target[slot] = m.winner_id;
    }
  });

  return rows;
}

// Agrupa una lista plana de partidos (fila de Supabase) en rondas [ [m,m], [m], ... ]
export function groupByRound(matches) {
  const byRound = {};
  matches.forEach((m) => {
    byRound[m.round_index] = byRound[m.round_index] || [];
    byRound[m.round_index][m.match_index] = m;
  });
  return Object.keys(byRound)
    .sort((a, b) => a - b)
    .map((r) => byRound[r]);
}
