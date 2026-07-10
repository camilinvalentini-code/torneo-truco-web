"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useTheme } from "../lib/theme";
import { supabase } from "../lib/supabaseClient";
import SuitIcon from "../components/SuitIcon";
import ThemeToggleButton from "../components/ThemeToggleButton";

export default function Home() {
  const { T } = useTheme();
  const [misTorneos, setMisTorneos] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(null);

  function leerGuardados() {
    try {
      return JSON.parse(window.localStorage.getItem("torneotruco:mis-torneos") || "[]");
    } catch (e) {
      return [];
    }
  }

  useEffect(() => {
    setMisTorneos(leerGuardados());
  }, []);

  async function borrarTorneo(id) {
    await supabase.from("tournaments").delete().eq("id", id);
    const restantes = leerGuardados().filter((t) => t.id !== id);
    window.localStorage.setItem("torneotruco:mis-torneos", JSON.stringify(restantes));
    setMisTorneos(restantes);
    setConfirmDelete(null);
  }

  return (
    <div className="min-h-screen transition-colors duration-500" style={{ background: T.bg }}>
      <div className="max-w-md mx-auto px-4 py-10">
        <div className="flex justify-end mb-4">
          <ThemeToggleButton />
        </div>
        <div className="flex items-center gap-2 justify-center mb-2">
          <SuitIcon suit="espada" size={22} />
          <SuitIcon suit="basto" size={22} />
          <SuitIcon suit="oro" size={22} />
          <SuitIcon suit="copa" size={22} />
        </div>
        <h1
          className="text-3xl font-black text-center tracking-tight mb-2"
          style={{ color: T.ink, fontFamily: "Georgia, serif" }}
        >
          Torneo de Truco
        </h1>
        <p className="text-center text-sm mb-8" style={{ color: T.inkDim }}>
          Armá el cuadro, sorteá, y que cada mesa cargue sus propios puntos desde el celular.
        </p>

        {misTorneos.length > 0 && (
          <div className="rounded-2xl p-4 mb-4 border shadow-sm" style={{ background: T.panel, borderColor: T.line }}>
            <h2 className="font-bold mb-2 text-sm" style={{ color: T.gold }}>
              Tus torneos en este dispositivo
            </h2>
            <div className="flex flex-col gap-2">
              {misTorneos.map((t) => (
                <div key={t.id} className="flex items-center gap-2">
                  <Link
                    href={`/torneo/${t.id}/admin?key=${t.admin_token}`}
                    className="flex-1 px-3 py-2 rounded-xl text-sm font-semibold transition-colors duration-200"
                    style={{ background: T.panelLight, color: T.ink }}
                  >
                    ⚔️ {t.nombre} <span style={{ color: T.inkDim, fontWeight: "normal" }}>({t.categoria})</span>
                  </Link>
                  {confirmDelete === t.id ? (
                    <>
                      <button
                        onClick={() => borrarTorneo(t.id)}
                        className="text-xs font-bold px-2 py-2"
                        style={{ color: T.redDim }}
                      >
                        confirmar
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="text-xs px-2 py-2"
                        style={{ color: T.inkDim }}
                      >
                        no
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(t.id)}
                      className="text-xs px-2 py-2"
                      style={{ color: T.inkDim }}
                      title="Borrar este torneo"
                    >
                      🗑
                    </button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-[11px] mt-2" style={{ color: T.inkDim }}>
              ¿Te equivocaste al crear uno? Tocá el link para entrar y editar sus datos, o el 🗑 para borrarlo del todo.
            </p>
          </div>
        )}

        <Link
          href="/crear"
          className="block text-center py-4 rounded-2xl font-black text-lg mb-3 transition-all duration-200 hover:scale-105 active:scale-95"
          style={{ background: T.gold, color: T.ink }}
        >
          ⚔️ Crear torneo nuevo
        </Link>
        <Link
          href="/historial"
          className="block text-center py-3 rounded-2xl font-bold text-sm transition-all duration-200 hover:scale-105 active:scale-95"
          style={{ background: T.panel, color: T.ink, border: `1px solid ${T.line}` }}
        >
          🏆 Ver historial de campeones
        </Link>

        <a
          href="https://instagram.com/truco.cordoba"
          target="_blank"
          rel="noreferrer"
          className="block text-center text-sm mt-8 font-semibold"
          style={{ color: T.inkDim }}
        >
          📸 @truco.cordoba
        </a>
      </div>
    </div>
  );
}

