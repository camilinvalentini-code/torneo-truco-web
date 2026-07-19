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
  const [claveNueva, setClaveNueva] = useState("");
  const [claveMsg, setClaveMsg] = useState("");
  const [claveLoading, setClaveLoading] = useState(false);
  const [slugNuevo, setSlugNuevo] = useState("");
  const [slugMsg, setSlugMsg] = useState("");
  const [slugLoading, setSlugLoading] = useState(false);

  async function guardarSlug() {
    const limpio = slugNuevo.trim().toLowerCase();
    if (!/^[a-z0-9-]{3,30}$/.test(limpio)) {
      setSlugMsg("Solo letras minúsculas, números y guiones, entre 3 y 30 caracteres.");
      return;
    }
    setSlugLoading(true);
    setSlugMsg("");
    const { error } = await supabase.rpc("actualizar_mi_slug", { nuevo_slug: limpio });
    setSlugLoading(false);
    if (error) {
      setSlugMsg(error.message?.includes("duplicate") ? "Ese link ya lo usa otro organizador, probá otro." : "No se pudo guardar. Probá de nuevo.");
      return;
    }
    setSlugMsg(`Listo — torneotruco.com.ar/t/${limpio}`);
  }

  async function guardarClave() {
    if (claveNueva.trim().length < 6) {
      setClaveMsg("La contraseña tiene que tener al menos 6 caracteres.");
      return;
    }
    setClaveLoading(true);
    setClaveMsg("");
    const { error } = await supabase.auth.updateUser({ password: claveNueva.trim() });
    setClaveLoading(false);
    if (error) {
      setClaveMsg("No se pudo guardar. Probá de nuevo.");
      return;
    }
    setClaveNueva("");
    setClaveMsg("Listo — ya podés usar esta contraseña en cualquier dispositivo, junto con tu email.");
  }

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
    if (profile?.slug) setSlugNuevo((prev) => prev || profile.slug);
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
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: T.bg }}>
        <div className="text-center max-w-sm">
          <p className="text-sm mb-4" style={{ color: T.ink }}>
            No pudimos confirmar tu sesión. Puede ser que el link ya se haya usado, o que haya pasado mucho tiempo
            desde que lo pediste.
          </p>
          <Link
            href="/organizador/acceso"
            className="inline-block px-5 py-2.5 rounded-2xl font-bold text-sm"
            style={{ background: T.gold, color: T.ink }}
          >
            Pedir el link de nuevo
          </Link>
        </div>
      </div>
    );
  }
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: T.bg }}>
        <div className="text-center max-w-sm">
          <p className="text-sm mb-4" style={{ color: T.ink }}>
            Tenés una sesión válida, pero todavía no existe tu perfil en la base — puede tardar unos segundos
            después de registrarte. Si esto no cambia, avisale a Camilo.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="inline-block px-5 py-2.5 rounded-2xl font-bold text-sm"
            style={{ background: T.gold, color: T.ink }}
          >
            Volver a intentar
          </button>
        </div>
      </div>
    );
  }
  if (profile.status !== "aprobado") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: T.bg }}>
        <div className="text-center max-w-sm">
          <p className="text-sm mb-4" style={{ color: T.ink }}>
            Tu cuenta todavía está en revisión.
          </p>
          <Link
            href="/organizador/pendiente"
            className="inline-block px-5 py-2.5 rounded-2xl font-bold text-sm"
            style={{ background: T.gold, color: T.ink }}
          >
            Ver estado de mi cuenta
          </Link>
        </div>
      </div>
    );
  }

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

        <div className="rounded-2xl p-4 mb-8 border" style={{ background: T.panel, borderColor: T.line }}>
          <h2 className="font-bold mb-1 text-sm" style={{ color: T.gold }}>
            🔑 Contraseña para tu equipo
          </h2>
          <p className="text-xs mb-3" style={{ color: T.inkDim }}>
            Si en el bar varias personas usan esta cuenta desde celus distintos, configurá una contraseña acá — así entran directo con tu email + esta clave, sin necesitar el mail cada vez.
          </p>
          <div className="flex gap-2">
            <input
              value={claveNueva}
              onChange={(e) => setClaveNueva(e.target.value)}
              type="password"
              placeholder="Nueva contraseña (mín. 6 caracteres)"
              className="flex-1 px-3 py-2 rounded-xl text-sm"
              style={{ background: T.bg, color: T.ink, border: `1px solid ${T.line}` }}
            />
            <button
              onClick={guardarClave}
              disabled={claveLoading}
              className="px-4 py-2 rounded-xl font-bold text-sm disabled:opacity-60"
              style={{ background: T.gold, color: T.ink }}
            >
              {claveLoading ? "..." : "Guardar"}
            </button>
          </div>
          {claveMsg && (
            <p className="text-xs mt-2" style={{ color: T.goldBright }}>
              {claveMsg}
            </p>
          )}
        </div>

        <div className="rounded-2xl p-4 mb-8 border" style={{ background: T.panel, borderColor: T.line }}>
          <h2 className="font-bold mb-1 text-sm" style={{ color: T.gold }}>
            🔗 Tu link corto
          </h2>
          <p className="text-xs mb-3" style={{ color: T.inkDim }}>
            Elegí un link fijo y fácil de compartir (ej: torneotruco.com.ar/t/vidonbar). Siempre va a mostrar tu
            torneo más reciente — cuando crees uno nuevo, se actualiza solo, sin cambiar el link.
          </p>
          <div className="flex gap-2">
            <div
              className="flex-1 flex items-center px-3 py-2 rounded-xl text-sm"
              style={{ background: T.bg, color: T.inkDim, border: `1px solid ${T.line}` }}
            >
              <span className="truncate">torneotruco.com.ar/t/</span>
              <input
                value={slugNuevo}
                onChange={(e) => setSlugNuevo(e.target.value.toLowerCase())}
                placeholder="tubar"
                className="flex-1 min-w-0 bg-transparent outline-none"
                style={{ color: T.ink }}
              />
            </div>
            <button
              onClick={guardarSlug}
              disabled={slugLoading}
              className="px-4 py-2 rounded-xl font-bold text-sm disabled:opacity-60"
              style={{ background: T.gold, color: T.ink }}
            >
              {slugLoading ? "..." : "Guardar"}
            </button>
          </div>
          {slugMsg && (
            <p className="text-xs mt-2" style={{ color: T.goldBright }}>
              {slugMsg}
            </p>
          )}
        </div>

        {(() => {
          const enVivo = misTorneos.filter((t) => t.started && !t.champion_id && !t.cerrado);
          const pendientes = misTorneos.filter((t) => !t.started);
          const finalizados = misTorneos.filter((t) => !!t.champion_id || t.cerrado);
          const Fila = (t) => (
            <Link
              key={t.id}
              href={`/torneo/${t.id}/admin`}
              className="px-4 py-3 rounded-xl font-semibold text-sm transition-colors duration-200"
              style={{ background: T.panel, color: T.ink, border: `1px solid ${T.line}` }}
            >
              🎴 {t.nombre} <span style={{ color: T.inkDim, fontWeight: "normal" }}>({t.categoria} · {t.fecha})</span>
              {t.encargado && <span style={{ color: T.inkDim, fontWeight: "normal" }}> · {t.encargado}</span>}
              {t.champion_id && <span className="ml-2">🏆</span>}
              {!t.champion_id && t.cerrado && <span className="ml-2">🏁</span>}
            </Link>
          );
          return (
            <>
              <h2 className="font-bold mb-3 text-sm" style={{ color: T.gold }}>
                🔴 En vivo ({enVivo.length})
              </h2>
              <div className="flex flex-col gap-2 mb-6">
                {enVivo.length === 0 && (
                  <p className="text-sm" style={{ color: T.inkDim }}>
                    Ninguno corriendo ahora.
                  </p>
                )}
                {enVivo.map(Fila)}
              </div>

              <h2 className="font-bold mb-3 text-sm" style={{ color: T.gold }}>
                🕓 Pendientes ({pendientes.length})
              </h2>
              <div className="flex flex-col gap-2 mb-6">
                {pendientes.length === 0 && (
                  <p className="text-sm" style={{ color: T.inkDim }}>
                    No hay ninguno esperando el sorteo.
                  </p>
                )}
                {pendientes.map(Fila)}
              </div>

              <h2 className="font-bold mb-3 text-sm" style={{ color: T.gold }}>
                ✅ Finalizados ({finalizados.length})
              </h2>
              <div className="flex flex-col gap-2 mb-8">
                {finalizados.length === 0 && (
                  <p className="text-sm" style={{ color: T.inkDim }}>
                    Todavía ninguno terminado.
                  </p>
                )}
                {finalizados.map(Fila)}
              </div>
            </>
          );
        })()}

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
