"use client";
import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "../../../lib/theme";
import { useAuth } from "../../../lib/useAuth";
import { supabase } from "../../../lib/supabaseClient";
import ThemeToggleButton from "../../../components/ThemeToggleButton";
import SuitIcon from "../../../components/SuitIcon";

export default function PanelAdmin() {
  const { T } = useTheme();
  const router = useRouter();
  const { session, profile, loading: authLoading, salir } = useAuth();
  const [pendientes, setPendientes] = useState([]);
  const [organizadores, setOrganizadores] = useState([]);
  const [torneos, setTorneos] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: pend } = await supabase.from("profiles").select("*").eq("status", "pendiente").order("created_at");
    const { data: aprob } = await supabase
      .from("profiles")
      .select("*")
      .eq("status", "aprobado")
      .eq("role", "organizador")
      .order("nombre");
    const { data: ts } = await supabase.from("tournaments").select("*").order("created_at", { ascending: false });
    setPendientes(pend || []);
    setOrganizadores(aprob || []);
    setTorneos(ts || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!authLoading && !session) router.push("/organizador/acceso");
    if (!authLoading && profile && (profile.role !== "admin" || profile.status !== "aprobado")) {
      router.push("/organizador/panel");
    }
  }, [authLoading, session, profile, router]);

  useEffect(() => {
    load();
  }, [load]);

  async function aprobar(id) {
    await supabase.from("profiles").update({ status: "aprobado" }).eq("id", id);
    load();
  }
  async function rechazar(id) {
    await supabase.from("profiles").update({ status: "rechazado" }).eq("id", id);
    load();
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: T.bg, color: T.ink }}>
        Cargando…
      </div>
    );
  }
  if (!session || !profile || profile.role !== "admin") return null;

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
        <h1 className="text-2xl font-black text-center mb-6" style={{ color: T.ink, fontFamily: "Georgia, serif" }}>
          Panel de administrador
        </h1>

        {pendientes.length > 0 && (
          <div className="rounded-2xl p-4 mb-6 border shadow-sm" style={{ background: T.panel, borderColor: T.line }}>
            <h2 className="font-bold mb-3 text-sm" style={{ color: T.gold }}>
              Organizadores esperando aprobación ({pendientes.length})
            </h2>
            <div className="flex flex-col gap-2">
              {pendientes.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl"
                  style={{ background: T.panelLight }}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate" style={{ color: T.ink }}>
                      {p.nombre || "(sin nombre)"}
                    </div>
                    <div className="text-xs truncate" style={{ color: T.inkDim }}>
                      {p.email}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => aprobar(p.id)}
                      className="text-xs font-bold px-3 py-1.5 rounded-full"
                      style={{ background: T.gold, color: T.ink }}
                    >
                      aprobar
                    </button>
                    <button onClick={() => rechazar(p.id)} className="text-xs px-2" style={{ color: T.redDim }}>
                      rechazar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <h2 className="font-bold mb-3 text-sm" style={{ color: T.gold }}>
          Organizadores activos ({organizadores.length})
        </h2>
        <div className="flex flex-wrap gap-2 mb-6">
          {organizadores.map((o) => (
            <span
              key={o.id}
              className="text-xs px-3 py-1.5 rounded-full"
              style={{ background: T.panelLight, color: T.ink }}
            >
              {o.nombre || o.email}
            </span>
          ))}
        </div>

        <h2 className="font-bold mb-3 text-sm" style={{ color: T.gold }}>
          Todos los torneos ({torneos.length})
        </h2>
        <div className="flex flex-col gap-2">
          {torneos.map((t) => (
            <Link
              key={t.id}
              href={`/torneo/${t.id}/admin`}
              className="px-4 py-3 rounded-xl text-sm transition-colors duration-200"
              style={{ background: T.panel, color: T.ink, border: `1px solid ${T.line}` }}
            >
              🎴 {t.nombre} <span style={{ color: T.inkDim }}>({t.categoria} · {t.ubicacion})</span>
              {t.champion_id && <span className="ml-2">🏆</span>}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
