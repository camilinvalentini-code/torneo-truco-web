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
  const [perfilesPorId, setPerfilesPorId] = useState({});
  const [loading, setLoading] = useState(true);
  const [confirmarBorrar, setConfirmarBorrar] = useState(null);

  const load = useCallback(async () => {
    const { data: pend } = await supabase.from("profiles").select("*").eq("status", "pendiente").order("created_at");
    const { data: aprob } = await supabase
      .from("profiles")
      .select("*")
      .eq("status", "aprobado")
      .eq("role", "organizador")
      .order("nombre");
    const { data: todos } = await supabase.from("profiles").select("id, nombre, email");
    const { data: ts } = await supabase.from("tournaments").select("*").order("created_at", { ascending: false });
    const mapa = {};
    (todos || []).forEach((p) => (mapa[p.id] = p));
    setPendientes(pend || []);
    setes(aprob || []);
    setTorneos(ts || []);
    setPerfilesPorId(mapa);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!authLoading && !session) router.push("//acceso");
    if (!authLoading && profile && (profile.role !== "admin" || profile.status !== "aprobado")) {
      router.push("//panel");
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
  async function borrarTorneo(idTorneo) {
    await supabase.from("tournaments").delete().eq("id", idTorneo);
    setConfirmarBorrar(null);
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
            ← Inicio
          </Link>
          <div className="flex gap-3 items-center">
            <button onClick={salir} className="text-xs underline" style={{ color: T.inkDim }}>
              Cerrar sesión
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
        <h1 className="text-2xl font-black text-center mb-1" style={{ color: T.ink, fontFamily: "Georgia, serif" }}>
          Panel de administrador
        </h1>
        <p className="text-center text-xs mb-6" style={{ color: T.inkDim }}>
          Conectado como <strong style={{ color: T.gold }}>{profile.nombre || profile.email}</strong> ({profile.email})
        </p>

        <Link
          href="/admin/jugadores"
          className="block text-center py-2.5 rounded-2xl font-bold text-sm mb-6 transition-all duration-200 hover:scale-105 active:scale-95"
          style={{ background: T.panel, color: T.ink, border: `1px solid ${T.line}` }}
        >
          🔀 Fusionar jugadores duplicados
        </Link>

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
                      Aprobar
                    </button>
                    <button onClick={() => rechazar(p.id)} className="text-xs px-2" style={{ color: T.redDim }}>
                      Rechazar
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
          {torneos.map((t) => {
            const org = perfilesPorId[t.organizador_id];
            return (
              <div
                key={t.id}
                className="px-4 py-3 rounded-xl text-sm transition-colors duration-200 flex items-center gap-2"
                style={{ background: T.panel, border: `1px solid ${T.line}` }}
              >
                <Link href={`/torneo/${t.id}/admin`} className="flex-1 min-w-0" style={{ color: T.ink }}>
                  <div className="truncate">
                    🎴 {t.nombre} <span style={{ color: T.inkDim }}>({t.categoria} · {t.ubicacion})</span>
                    {t.champion_id && <span className="ml-2">🏆</span>}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: T.inkDim }}>
                    Organizador: {org ? org.nombre || org.email : "sin asignar"}
                  </div>
                </Link>
                {confirmarBorrar === t.id ? (
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => borrarTorneo(t.id)}
                      className="text-xs font-bold px-2.5 py-1.5 rounded-full"
                      style={{ background: T.redDim, color: "#FFFFFF" }}
                    >
                      confirmar
                    </button>
                    <button
                      onClick={() => setConfirmarBorrar(null)}
                      className="text-xs px-2"
                      style={{ color: T.inkDim }}
                    >
                      no
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmarBorrar(t.id)}
                    className="text-xs px-2 flex-shrink-0"
                    style={{ color: T.redDim }}
                    title="Borrar este torneo"
                  >
                    🗑
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
