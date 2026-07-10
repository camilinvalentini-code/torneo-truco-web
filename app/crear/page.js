"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTheme } from "../../lib/theme";
import { useAuth } from "../../lib/useAuth";
import { supabase } from "../../lib/supabaseClient";
import ThemeToggleButton from "../../components/ThemeToggleButton";

function hoy() {
  return new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function CrearTorneo() {
  const { T } = useTheme();
  const router = useRouter();
  const { session, profile, loading: authLoading } = useAuth();
  const [nombre, setNombre] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [fecha, setFecha] = useState(hoy());
  const [categoria, setCategoria] = useState("2v2");
  const [repechaje, setRepechaje] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!session) {
      router.push("/organizador/acceso");
      return;
    }
    if (profile && profile.status !== "aprobado") {
      router.push("/organizador/pendiente");
    }
  }, [authLoading, session, profile, router]);

  async function crear() {
    setError("");
    if (!nombre.trim() || !ubicacion.trim()) {
      setError("Faltan datos: el nombre y la ubicación del torneo son obligatorios.");
      return;
    }
    setLoading(true);
    const { data, error: err } = await supabase
      .from("tournaments")
      .insert({ nombre, ubicacion, fecha, categoria, repechaje, organizador_id: session.user.id })
      .select()
      .single();
    setLoading(false);
    if (err) {
      setError("No se pudo crear el torneo. Puede que tu cuenta todavía no esté aprobada.");
      console.error(err);
      return;
    }
    router.push(`/torneo/${data.id}/admin`);
  }

  if (authLoading || !session || (profile && profile.status !== "aprobado")) return null;

  return (
    <div className="min-h-screen transition-colors duration-500" style={{ background: T.bg }}>
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="flex justify-between mb-4">
          <Link href="/organizador/panel" className="text-xs underline" style={{ color: T.inkDim }}>
            ← mi panel
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
              placeholder="Nombre del torneo* (ej: BOKA TALÓN)"
              className="px-3 py-2 rounded-xl text-sm"
              style={{ background: T.bg, color: T.ink, border: `1px solid ${T.line}` }}
            />
            <input
              value={ubicacion}
              onChange={(e) => setUbicacion(e.target.value)}
              placeholder="Ubicación* (ej: Seis Monos Bar)"
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
