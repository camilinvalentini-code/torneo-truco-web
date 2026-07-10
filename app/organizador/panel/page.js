"use client";
import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "../../../lib/theme";
import { useAuth } from "../../../lib/useAuth";
import { supabase } from "../../../lib/supabaseClient";
import ThemeToggleButton from "../../../components/ThemeToggleButton";
import SuitIcon from "../../../components/SuitIcon";

export default function PanelOrganizador() {
  const { T } = useTheme();
  const router = useRouter();
  const { session, profile, loading: authLoading, salir } = useAuth();
  const [misTorneos, setMisTorneos] = useState([]);
  const [otros, setOtros] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session) return;
    const { data: mios } = await supabase
      .from("tournaments")
      .select("*")
      .eq("organizador_id", session.user.id)
      .order("created_at", { ascending: false });
    const { data: todos } = await supabase
      .from("tournaments")
      .select("*")
      .neq("organizador_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(30);
    setMisTorneos(mios || []);
    setOtros(todos || []);
    setLoading(false);
  }, [session]);

  useEffect(() => {
    if (!authLoading && !session) router.push("/organizador/acceso");
    if (!authLoading && profile && profile.status !== "aprobado") router.push("/organizador/pendiente");
  }, [authLoading, session, profile, router]);

  useEffect(() => {
    load();
  }, [load]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: T.bg, color: T.ink }}>
        Cargando…
      </div>
    );
  }
  if (!session || !profile || profile.status !== "aprobado") return null;

  return (
    <div className="min-h-screen transition-colors duration-500" style={{ background: T.bg }}>
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex justify-between mb-2">
          <Link href="/" className="text-xs underline" style={{ color: T.inkDim }}>
            ← inicio
          </Link>
          <div className="flex gap-3 items-center">
            <button onClick={salir} className="text-xs underline" style={{ color: T.inkDim }}>
              cerrar sesión
            </button>
            <ThemeToggleButton />
          </div>
        </div>
        <div className="flex items-center gap-2 justify-center mb-1">
          <SuitIcon suit="espada" size={20} />
          <SuitIcon suit="basto" size={20} />
          <SuitIcon suit="oro" size={20} />
          <SuitIcon suit="copa" size={20} />
        </div>
        <h1 className="text-2xl font-black text-center" style={{ color: T.ink, fontFamily: "Georgia, serif" }}>
          Hola, {profile.nombre || profile.email}
        </h1>
        <p className="text-center text-sm mb-6" style={{ color: T.inkDim }}>
          Panel de organizador
        </p>

        <Link
          href="/crear"
          className="block text-center py-3 rounded-2xl font-black text-base mb-6 transition-all duration-200 hover:scale-105 active:scale-95"
          style={{ background: T.gold, color: T.ink }}
        >
          🎴 Crear torneo nuevo
        </Link>

        <h2 className="font-bold mb-3 text-sm" style={{ color: T.gold }}>
          Tus torneos ({misTorneos.length})
        </h2>
        <div className="flex flex-col gap-2 mb-8">
          {misTorneos.length === 0 && (
            <p className="text-sm" style={{ color: T.inkDim }}>
              Todavía no creaste ningún torneo.
            </p>
          )}
          {misTorneos.map((t) => (
            <Link
              key={t.id}
              href={`/torneo/${t.id}/admin`}
              className="px-4 py-3 rounded-xl font-semibold text-sm transition-colors duration-200"
              style={{ background: T.panel, color: T.ink, border: `1px solid ${T.line}` }}
            >
              🎴 {t.nombre} <span style={{ color: T.inkDim, fontWeight: "normal" }}>({t.categoria} · {t.fecha})</span>
              {t.champion_id && <span className="ml-2">🏆</span>}
            </Link>
          ))}
        </div>

        <h2 className="font-bold mb-3 text-sm" style={{ color: T.gold }}>
          Otros torneos en vivo (solo podés mirar)
        </h2>
        <div className="flex flex-col gap-2">
          {otros.length === 0 && (
            <p className="text-sm" style={{ color: T.inkDim }}>
              No hay otros torneos todavía.
            </p>
          )}
          {otros.map((t) => (
            <Link
              key={t.id}
              href={`/torneo/${t.id}`}
              className="px-4 py-3 rounded-xl text-sm transition-colors duration-200"
              style={{ background: T.panelLight, color: T.ink }}
            >
              👁 {t.nombre} <span style={{ color: T.inkDim }}>({t.categoria} · {t.ubicacion})</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
