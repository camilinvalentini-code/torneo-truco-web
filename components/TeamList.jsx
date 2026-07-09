"use client";
import React from "react";
import { useTheme } from "../lib/theme";
import { INK_ON_LIGHT } from "../lib/theme";

export default function TeamList({ teams, onTogglePaid, onRemove, editable }) {
  const { T } = useTheme();
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
            onClick={() => onTogglePaid(t.id, !t.paid)}
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
