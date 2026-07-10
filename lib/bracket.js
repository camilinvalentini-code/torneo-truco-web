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
