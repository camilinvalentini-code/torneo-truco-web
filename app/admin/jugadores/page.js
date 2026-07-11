"use client";
import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "../../../lib/theme";
import { useAuth } from "../../../lib/useAuth";
import { supabase } from "../../../lib/supabaseClient";
import ThemeToggleButton from "../../../components/ThemeToggleButton";

export default function FusionarJugadores() {
  const { T } = useTheme();
  const router = useRouter();
  const { session, profile, loading: authLoading } = useAuth();
  const [jugadores, setJugadores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [seleccion, setSeleccion] = useState([]); // hasta 2 ids
  const [mensaje, setMensaje] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabase.from("players").select("*").order("name");
    setJugadores(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!authLoading && !session) router.push("/organizador/acceso");
    if (!authLoading && profile && profile.role !== "admin") router.push("/organizador/panel");
  }, [authLoading, session, profile, router]);

  useEffect(() => {
    load();
  }, [load]);

  function toggleSeleccion(id) {
    setMensaje("");
    setSeleccion((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  }

  async function fusionar() {
    if (seleccion.length !== 2) return;
    const [bueno, duplicado] = seleccion;
    const { error } = await supabase.rpc("fusionar_jugadores", { id_bueno: bueno, id_duplicado: duplicado });
    if (error) {
      setMensaje("No se pudo fusionar: " + error.message);
      return;
    }
    setMensaje("Fusionados correctamente.");
    setSeleccion([]);
    load();
  }

  if (authLoading || loading) return null;
  if (!session || !profile || profile.role !== "admin") return null;

  const filtrados = jugadores.filter((j) => j.name.toLowerCase().includes(busqueda.toLowerCase()));
  const nombreSel = (id) => jugadores.find((j) => j.id === id)?.name;

  return (
    <div className="min-h-screen transition-colors duration-500" style={{ background: T.bg }}>
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="flex justify-between mb-4">
          <Link href="/admin/panel" className="text-xs underline" style={{ color: T.inkDim }}>
            ← panel admin
          </Link>
          <ThemeToggleButton />
        </div>
        <h1 className="text-xl font-black text-center mb-1" style={{ color: T.ink, fontFamily: "Georgia, serif" }}>
          Fusionar jugadores duplicados
        </h1>
        <p className="text-center text-xs mb-5" style={{ color: T.inkDim }}>
          Elegí dos que sean la misma persona. El primero que toques queda como el "bueno" (se conserva su nombre),
          el segundo se fusiona adentro y desaparece.
        </p>

        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar jugador..."
          className="w-full px-3 py-2 rounded-xl text-sm mb-3"
          style={{ background: T.panel, color: T.ink, border: `1px solid ${T.line}` }}
        />

        {seleccion.length > 0 && (
          <div className="rounded-2xl p-3 mb-3 border" style={{ background: "#FBF3E3", borderColor: "#EAC27A" }}>
            <div className="text-xs font-bold mb-1" style={{ color: "#33453E" }}>
              Seleccionados:
            </div>
            {seleccion.map((id, i) => (
              <div key={id} className="text-sm" style={{ color: "#33453E" }}>
                {i === 0 ? "✅ queda como:" : "🔀 se fusiona adentro:"} <strong>{nombreSel(id)}</strong>
              </div>
            ))}
            {seleccion.length === 2 && (
              <button
                onClick={fusionar}
                className="w-full mt-2 py-2 rounded-xl font-bold text-sm"
                style={{ background: T.gold, color: T.ink }}
              >
                Confirmar fusión
              </button>
            )}
          </div>
        )}

        {mensaje && (
          <p className="text-center text-sm mb-3" style={{ color: T.goldBright }}>
            {mensaje}
          </p>
        )}

        <div className="flex flex-col gap-1.5">
          {filtrados.map((j) => (
            <button
              key={j.id}
              onClick={() => toggleSeleccion(j.id)}
              className="px-3 py-2 rounded-xl text-sm text-left transition-colors duration-150"
              style={{
                background: seleccion.includes(j.id) ? T.gold : T.panel,
                color: seleccion.includes(j.id) ? T.ink : T.ink,
                border: `1px solid ${T.line}`,
              }}
            >
              {j.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
