"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTheme } from "../../lib/theme";
import { supabase } from "../../lib/supabaseClient";
import ThemeToggleButton from "../../components/ThemeToggleButton";

function randomToken() {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
}
function hoy() {
  return new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function CrearTorneo() {
  const { T } = useTheme();
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [fecha, setFecha] = useState(hoy());
  const [categoria, setCategoria] = useState("2v2");
  const [repechaje, setRepechaje] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function crear() {
    setError("");
    setLoading(true);
    const admin_token = randomToken();
    const { data, error: err } = await supabase
      .from("tournaments")
      .insert({ nombre, ubicacion, fecha, categoria, repechaje, admin_token })
      .select()
      .single();
    setLoading(false);
    if (err) {
      setError("No se pudo crear el torneo. Revisá que la base de datos esté conectada (ver README).");
      console.error(err);
      return;
    }
    router.push(`/torneo/${data.id}/admin?key=${admin_token}`);

    try {
      const saved = JSON.parse(window.localStorage.getItem("torneotruco:mis-torneos") || "[]");
      saved.unshift({ id: data.id, admin_token, nombre: nombre || "(sin nombre)", categoria, fecha });
      window.localStorage.setItem("torneotruco:mis-torneos", JSON.stringify(saved.slice(0, 20)));
    } catch (e) {
      /* si falla el guardado local no bloqueamos el flujo */
    }
  }

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
          Crear torneo
        </h1>

        <div className="rounded-2xl p-4 border shadow-sm" style={{ background: T.panel, borderColor: T.line }}>
          <div className="flex flex-col gap-2">
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre del torneo (ej: Torneo Lunes 13/7)"
              className="px-3 py-2 rounded-xl text-sm"
              style={{ background: T.bg, color: T.ink, border: `1px solid ${T.line}` }}
            />
            <input
              value={ubicacion}
              onChange={(e) => setUbicacion(e.target.value)}
              placeholder="Ubicación (ej: Córdoba, Vidon Bar, Achával)"
              className="px-3 py-2 rounded-xl text-sm"
              style={{ background: T.bg, color: T.ink, border: `1px solid ${T.line}` }}
            />
            <input
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              placeholder="Fecha"
              className="px-3 py-2 rounded-xl text-sm"
              style={{ background: T.bg, color: T.ink, border: `1px solid ${T.line}` }}
            />
            <div className="flex rounded-xl overflow-hidden border mt-1" style={{ borderColor: T.gold }}>
              {["2v2", "3v3"].map((c) => (
                <button
                  key={c}
                  onClick={() => setCategoria(c)}
                  className="flex-1 py-2 text-sm font-bold uppercase"
                  style={{ background: categoria === c ? T.gold : "transparent", color: categoria === c ? T.ink : T.inkDim }}
                >
                  {c}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-sm mt-2" style={{ color: T.ink }}>
              <input type="checkbox" checked={repechaje} onChange={(e) => setRepechaje(e.target.checked)} />
              Con repechaje
            </label>
          </div>
        </div>

        {error && (
          <p className="text-sm text-center mt-3" style={{ color: T.goldBright }}>
            {error}
          </p>
        )}

        <button
          onClick={crear}
          disabled={loading}
          className="w-full py-3 rounded-2xl font-black text-lg mt-4 transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-60"
          style={{ background: T.gold, color: T.ink }}
        >
          {loading ? "Creando…" : "Crear y anotar equipos →"}
        </button>
      </div>
    </div>
  );
}
