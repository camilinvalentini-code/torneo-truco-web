import { buildMatchRows } from "./bracket";

export async function declareWinner({ supabase, match, winnerId, tournamentId }) {
  await supabase.from("matches").update({ winner_id: winnerId }).eq("id", match.id);

  const { data: siblings } = await supabase
    .from("matches")
    .select("*")
    .eq("tournament_id", tournamentId)
    .eq("bracket", match.bracket);

  const maxRound = Math.max(...siblings.map((m) => m.round_index));

  if (match.round_index === maxRound) {
    const field = match.bracket === "main" ? "champion_id" : "repechaje_champion_id";
    await supabase.from("tournaments").update({ [field]: winnerId }).eq("id", tournamentId);
  } else {
    const nextRound = match.round_index + 1;
    const nextIdx = Math.floor(match.match_index / 2);
    const slot = match.match_index % 2 === 0 ? "team1_id" : "team2_id";
    const nextMatch = siblings.find((m) => m.round_index === nextRound && m.match_index === nextIdx);
    if (nextMatch) {
      await supabase.from("matches").update({ [slot]: winnerId }).eq("id", nextMatch.id);
    }
  }

  // Disparador del repechaje: cuando termina TODA la ronda 0 del cuadro principal.
  if (match.bracket === "main" && match.round_index === 0) {
    const round0 = siblings.filter((m) => m.round_index === 0);
    const allDone = round0.every((m) => m.winner_id);
    if (allDone) {
      const { data: t } = await supabase.from("tournaments").select("repechaje").eq("id", tournamentId).single();
      if (t?.repechaje) {
        const { data: existingRep } = await supabase
          .from("matches")
          .select("id")
          .eq("tournament_id", tournamentId)
          .eq("bracket", "repechaje")
          .limit(1);
        if (!existingRep || existingRep.length === 0) {
          const losers = round0
            .filter((m) => !m.bye)
            .map((m) => (m.team1_id === m.winner_id ? m.team2_id : m.team1_id));
          if (losers.length >= 2) {
            const rows = buildMatchRows({ tournamentId, bracket: "repechaje", teamIds: losers });
            await supabase.from("matches").insert(rows);
          } else if (losers.length === 1) {
            await supabase.from("tournaments").update({ repechaje_champion_id: losers[0] }).eq("id", tournamentId);
          }
        }
      }
    }
  }
}
