"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useTheme } from "../../lib/theme";
import { supabase } from "../../lib/supabaseClient";
import ThemeToggleButton from "../../components/ThemeToggleButton";

export default function EnVivo() {
  const { T } = useTheme();
  const [torneos, setTorneos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("tournaments")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      setTorneos(data || []);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="min-h-screen transition-colors duration-500" style={{ background: T.bg }}>
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="flex justify-between mb-4">
          <Link href="/" className="text-xs underline" style={{ color: T.inkDim }}>
            ← inicio
          </Link>
          <ThemeToggleButton />
        </div>
        <h1 className="text-2xl font-black text-center mb-6" style={{ color: T.ink, fontFamily: "Georgia, serif" }}>
          🎲 Torneos
        </h1>

        {loading ? (
          <p className="text-center text-sm" style={{ color: T.inkDim }}>
            Cargando…
          </p>
        ) : torneos.length === 0 ? (
          <p className="text-center text-sm" style={{ color: T.inkDim }}>
            Todavía no hay ningún torneo creado.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {torneos.map((t) => (
              <Link
                key={t.id}
                href={`/torneo/${t.id}`}
                className="px-4 py-3 rounded-xl transition-colors duration-200"
                style={{ background: T.panel, border: `1px solid ${T.line}` }}
              >
                <div className="text-sm font-bold" style={{ color: T.ink }}>
                  {t.nombre} {t.champion_id && "🏆"}
                </div>
                <div className="text-xs" style={{ color: T.inkDim }}>
                  {[t.ubicacion, t.fecha, t.categoria, t.started ? "en juego" : "todavía sin sortear"]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
