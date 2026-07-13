"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTheme } from "../../lib/theme";
import { useAuth } from "../../lib/useAuth";
import { supabase } from "../../lib/supabaseClient";
import { PAISES, provinciasDe } from "../../lib/geo";
import ThemeToggleButton from "../../components/ThemeToggleButton";

function hoy() {
  return new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function CrearTorneo() {
  const { T } = useTheme();
  const router = useRouter();
  const { session, profile, loading: authLoading } = useAuth();
  const [nombre, setNombre] = useState("");
  const [pais, setPais] = useState("AR");
  const [provincia, setProvincia] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [lugar, setLugar] = useState("");
  const [ciudadesSugeridas, setCiudadesSugeridas] = useState([]);
  const [fecha, setFecha] = useState(hoy());
  const [categoria, setCategoria] = useState("2v2");
  const [repechaje, setRepechaje] = useState(false);
  const [puntosMax, setPuntosMax] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [testCantidad, setTestCantidad] = useState(8);
  const [testCategoria, setTestCategoria] = useState("2v2");
  const [testRepechaje, setTestRepechaje] = useState(true);
  const [testLoading, setTestLoading] = useState(false);

  const NOMBRES_PRUEBA = [
    "Los Ases", "Ancho Falso", "Truco y Retruco", "Sol de Mayo", "Río Platenses",
    "Cuatro Vientos", "Malas y Buenas", "Envido Va", "Los Tantos", "Flor de Mesa",
    "Che Pintó", "Los Mentirosos", "Vale Cuatro", "Siete de Oro", "Los Cantores",
    "Tres Solo", "Falta Envido", "Los Aguante", "Con Flor y Todo", "Doble Falta",
  ];

  useEffect(() => {
    async function cargarCiudades() {
      if (!provincia) {
        setCiudadesSugeridas([]);
        return;
      }
      const { data } = await supabase
        .from("tournaments")
        .select("ciudad")
        .eq("pais", pais)
        .eq("provincia", provincia)
        .not("ciudad", "is", null);
      const unicas = [...new Set((data || []).map((r) => r.ciudad).filter(Boolean))];
      setCiudadesSugeridas(unicas);
    }
    cargarCiudades();
  }, [pais, provincia]);

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
    if (!nombre.trim() || !provincia || !ciudad.trim() || !lugar.trim()) {
      setError("Faltan datos: nombre, provincia, ciudad y lugar son obligatorios.");
      return;
    }
    setLoading(true);
    const { data, error: err } = await supabase
      .from("tournaments")
      .insert({
        nombre,
        pais,
        provincia,
        ciudad: ciudad.trim(),
        lugar: lugar.trim(),
        ubicacion: `${lugar.trim()}, ${ciudad.trim()}`, // por compatibilidad con vistas viejas
        fecha,
        categoria,
        repechaje,
        puntos_max: puntosMax,
        organizador_id: session.user.id,
      })
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

  async function generarTorneoPrueba() {
    setError("");
    setTestLoading(true);
    const n = Math.max(3, Math.min(64, Number(testCantidad) || 8));
    const nombreTest = `TEST ${n} equipos · ${new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}`;
    const { data: torneo, error: err } = await supabase
      .from("tournaments")
      .insert({
        nombre: nombreTest,
        pais: "AR",
        provincia: "Córdoba",
        ciudad: "Córdoba",
        lugar: "Prueba",
        ubicacion: "Prueba, Córdoba",
        fecha: hoy(),
        categoria: testCategoria,
        repechaje: testRepechaje,
        organizador_id: session.user.id,
      })
      .select()
      .single();
    if (err) {
      setError("No se pudo generar el torneo de prueba.");
      console.error(err);
      setTestLoading(false);
      return;
    }
    const equipos = Array.from({ length: n }, (_, i) => ({
      tournament_id: torneo.id,
      name: NOMBRES_PRUEBA[i % NOMBRES_PRUEBA.length] + (i >= NOMBRES_PRUEBA.length ? ` ${Math.floor(i / NOMBRES_PRUEBA.length) + 1}` : ""),
      players: "",
      paid: Math.random() < 0.6,
    }));
    await supabase.from("teams").insert(equipos);
    setTestLoading(false);
    router.push(`/torneo/${torneo.id}/admin`);
  }

  if (authLoading || !session || (profile && profile.status !== "aprobado")) return null;

  return (
    <div className="min-h-screen transition-colors duration-500" style={{ background: T.bg }}>
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="flex justify-between mb-4">
          <Link href="/organizador/panel" className="text-xs underline" style={{ color: T.inkDim }}>
            ← Mi panel
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

            <div className="flex gap-2">
              <select
                value={pais}
                onChange={(e) => {
                  setPais(e.target.value);
                  setProvincia("");
                  setCiudad("");
                }}
                className="px-3 py-2 rounded-xl text-sm flex-1"
                style={{ background: T.bg, color: T.ink, border: `1px solid ${T.line}` }}
              >
                {PAISES.map((p) => (
                  <option key={p.codigo} value={p.codigo}>
                    {p.nombre}
                  </option>
                ))}
              </select>
              <select
                value={provincia}
                onChange={(e) => {
                  setProvincia(e.target.value);
                  setCiudad("");
                }}
                className="px-3 py-2 rounded-xl text-sm flex-1"
                style={{ background: T.bg, color: T.ink, border: `1px solid ${T.line}` }}
              >
                <option value="">Provincia*</option>
                {provinciasDe(pais).map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <input
              value={ciudad}
              onChange={(e) => setCiudad(e.target.value)}
              placeholder="Ciudad*"
              list="ciudades-sugeridas"
              className="px-3 py-2 rounded-xl text-sm"
              style={{ background: T.bg, color: T.ink, border: `1px solid ${T.line}` }}
            />
            <datalist id="ciudades-sugeridas">
              {ciudadesSugeridas.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>

            <input
              value={lugar}
              onChange={(e) => setLugar(e.target.value)}
              placeholder="Lugar* (ej: Vidon Bar, o Mi casa)"
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
              {["1v1", "2v2", "3v3"].map((c) => (
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

            <div className="mt-2">
              <span className="text-xs" style={{ color: T.inkDim }}>
                Tanteador a:
              </span>
              <div className="flex rounded-xl overflow-hidden border mt-1" style={{ borderColor: T.gold }}>
                {[30, 15].map((p) => (
                  <button
                    key={p}
                    onClick={() => setPuntosMax(p)}
                    className="flex-1 py-2 text-sm font-bold"
                    style={{ background: puntosMax === p ? T.gold : "transparent", color: puntosMax === p ? T.ink : T.inkDim }}
                  >
                    {p} puntos
                  </button>
                ))}
              </div>
            </div>
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

        <div
          className="rounded-2xl p-4 border-2 border-dashed mt-8"
          style={{ background: T.panel, borderColor: T.redDim }}
        >
          <h2 className="font-bold mb-1 text-sm" style={{ color: T.redDim }}>
            🧪 Generar torneo de prueba
          </h2>
          <p className="text-xs mb-3" style={{ color: T.inkDim }}>
            Crea un torneo con equipos falsos ya cargados, para testear rápido. No sirve para un torneo real.
          </p>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs flex-shrink-0" style={{ color: T.inkDim }}>
                Cantidad de equipos
              </span>
              <input
                type="number"
                min={3}
                max={64}
                value={testCantidad}
                onChange={(e) => setTestCantidad(e.target.value)}
                className="px-3 py-2 rounded-xl text-sm flex-1"
                style={{ background: T.bg, color: T.ink, border: `1px solid ${T.line}` }}
              />
            </div>
            <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: T.redDim }}>
              {["1v1", "2v2", "3v3"].map((c) => (
                <button
                  key={c}
                  onClick={() => setTestCategoria(c)}
                  className="flex-1 py-2 text-sm font-bold uppercase"
                  style={{ background: testCategoria === c ? T.redDim : "transparent", color: testCategoria === c ? "#FFFFFF" : T.inkDim }}
                >
                  {c}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-sm" style={{ color: T.ink }}>
              <input type="checkbox" checked={testRepechaje} onChange={(e) => setTestRepechaje(e.target.checked)} />
              Con repechaje
            </label>
            <button
              onClick={generarTorneoPrueba}
              disabled={testLoading}
              className="py-2.5 rounded-xl font-bold text-sm mt-1 transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-60"
              style={{ background: T.redDim, color: "#FFFFFF" }}
            >
              {testLoading ? "Generando…" : "🎲 Generar y anotar equipos ya"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
