"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useTheme } from "../../lib/theme";
import { supabase } from "../../lib/supabaseClient";
import ThemeToggleButton from "../../components/ThemeToggleButton";

export default function HistorialPage() {
  const { T } = useTheme();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: torneos } = await supabase
        .from("tournaments")
        .select("*")
        .not("champion_id", "is", null)
        .order("created_at", { ascending: false });
      const champIds = (torneos || []).map((t) => t.champion_id).filter(Boolean);
      let teamsById = {};
      if (champIds.length) {
        const { data: ts } = await supabase.from("teams").select("id, name").in("id", champIds);
        (ts || []).forEach((t) => (teamsById[t.id] = t));
      }
      setRows((torneos || []).map((t) => ({ ...t, campeonNombre: teamsById[t.champion_id]?.name })));
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="min-h-screen transition-colors duration-500" style={{ background: T.bg }}>
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="flex justify-end mb-4">
          <ThemeToggleButton />
        </div>
        <h1 className="text-2xl font-black text-center mb-6" style={{ color: T.ink, fontFamily: "Georgia, serif" }}>
          🏆 Historial de campeones
        </h1>

        {loading ? (
          <p className="text-center text-sm" style={{ color: T.inkDim }}>
            Cargando…
          </p>
        ) : rows.length === 0 ? (
          <p className="text-center text-sm" style={{ color: T.inkDim }}>
            Todavía no se coronó ningún campeón.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {rows.map((t) => (
              <div key={t.id} className="px-4 py-3 rounded-xl" style={{ background: T.panel, border: `1px solid ${T.line}` }}>
                <div className="text-sm font-bold" style={{ color: T.ink }}>
                  {t.campeonNombre} <span style={{ color: T.inkDim, fontWeight: "normal" }}>({t.categoria})</span>
                </div>
                <div className="text-xs" style={{ color: T.inkDim }}>
                  {t.nombre}
                  {t.ubicacion && ` — ${t.ubicacion}`}
                  {t.fecha && ` — ${t.fecha}`}
                  {t.encargado && ` — organizó ${t.encargado}`}
                </div>
              </div>
            ))}
          </div>
        )}

        <Link
          href="/"
          className="block text-center text-xs underline mt-6"
          style={{ color: T.inkDim }}
        >
          ← Volver al inicio
        </Link>
      </div>
    </div>
  );
}
