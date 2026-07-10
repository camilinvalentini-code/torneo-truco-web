"use client";
import React from "react";
import { useTheme } from "../lib/theme";
import SuitIcon, { SUITS } from "./SuitIcon";
import { groupByRound, roundLabel } from "../lib/bracket";

export default function BracketDisplay({ matches, teamsById, adminMode, tournamentUrl, onDeclareWinner }) {
  const { T } = useTheme();
  if (!matches || matches.length === 0) return null;
  const rounds = groupByRound(matches);
  const nameOf = (id) => (id ? teamsById[id]?.name || "???" : null);

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
          <div className="flex flex-col gap-4">
            {round.map((m) => {
              const playable = adminMode && !!onDeclareWinner && !m.bye && !m.winner_id && m.team1_id && m.team2_id;
              return (
                <div
                  key={m.id}
                  className="rounded-2xl border p-2 shadow-sm transition-all duration-300"
                  style={{
                    background: T.panel,
                    borderColor: m.bye ? T.line : m.winner_id ? T.gold : T.line,
                    opacity: m.bye ? 0.65 : 1,
                  }}
                >
                  {[m.team1_id, m.team2_id].map((tid, i) => {
                    const isWinner = m.winner_id && m.winner_id === tid;
                    const isLoser = m.winner_id && tid && m.winner_id !== tid;
                    const label = tid ? nameOf(tid) : m.bye ? (i === 1 ? "LIBRE" : "—") : "Por definir";
                    const score = i === 0 ? m.score_a : m.score_b;
                    const Tag = playable ? "button" : "div";
                    return (
                      <div key={i}>
                        {i === 1 && <div className="h-px my-1" style={{ background: T.line }} />}
                        <Tag
                          onClick={playable ? () => onDeclareWinner(m, tid) : undefined}
                          className="w-full text-left px-3 py-2 rounded-xl text-sm font-semibold truncate flex items-center justify-between gap-2 transition-colors duration-150"
                          style={{
                            color: isWinner ? T.goldBright : isLoser ? T.inkDim : T.ink,
                            opacity: isLoser ? 0.5 : 1,
                            textDecoration: isLoser ? "line-through" : "none",
                            background: isWinner ? "rgba(234,194,122,0.25)" : "transparent",
                            cursor: playable ? "pointer" : "default",
                          }}
                        >
                          <span className="truncate">{label}</span>
                          {!m.bye && score > 0 && (
                            <span className="font-black text-base flex-shrink-0" style={{ color: T.goldBright }}>
                              {score}
                            </span>
                          )}
                        </Tag>
                      </div>
                    );
                  })}
                  {m.bye && (
                    <div className="text-xs text-center mt-1" style={{ color: T.inkDim }}>
                      Pasa libre de ronda
                    </div>
                  )}
                  {playable && (
                    <div className="text-[11px] text-center mt-1" style={{ color: T.inkDim }}>
                      tocá el ganador para forzarlo
                    </div>
                  )}
                  {adminMode && !m.bye && !m.winner_id && m.team1_id && m.team2_id && (
                    <a
                      href={`${tournamentUrl}/partido/${m.match_token}`}
                      target="_blank"
                      rel="noreferrer"
                      className="block text-center text-xs mt-2 underline"
                      style={{ color: T.goldBright }}
                    >
                      abrir anotador de esta mesa →
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
