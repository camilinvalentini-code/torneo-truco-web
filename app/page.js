"use client";
import Link from "next/link";
import { useTheme } from "../lib/theme";
import { useAuth } from "../lib/useAuth";
import SuitIcon from "../components/SuitIcon";
import ThemeToggleButton from "../components/ThemeToggleButton";

export default function Home() {
  const { T } = useTheme();
  const { session, profile, loading } = useAuth();

  const panelHref = profile?.role === "admin" ? "/admin/panel" : "/organizador/panel";

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

        {!loading && session && profile && (
          <Link
            href={panelHref}
            className="block text-center py-4 rounded-2xl font-black text-lg mb-3 transition-all duration-200 hover:scale-105 active:scale-95"
            style={{ background: T.gold, color: T.ink }}
          >
            🎴 Ir a mi panel
          </Link>
        )}
        {!loading && !session && (
          <Link
            href="/organizador/acceso"
            className="block text-center py-4 rounded-2xl font-black text-lg mb-3 transition-all duration-200 hover:scale-105 active:scale-95"
            style={{ background: T.gold, color: T.ink }}
          >
            🎴 Soy organizador, quiero entrar
          </Link>
        )}

        <Link
          href="/en-vivo"
          className="block text-center py-3 rounded-2xl font-bold text-sm mb-3 transition-all duration-200 hover:scale-105 active:scale-95"
          style={{ background: T.panel, color: T.ink, border: `1px solid ${T.line}` }}
        >
          🎲 Ver torneos en vivo
        </Link>
        <Link
          href="/historial"
          className="block text-center py-3 rounded-2xl font-bold text-sm mb-3 transition-all duration-200 hover:scale-105 active:scale-95"
          style={{ background: T.panel, color: T.ink, border: `1px solid ${T.line}` }}
        >
          🏆 Ver historial de campeones
        </Link>

        <Link
          href="/anotador"
          className="block text-center py-3 rounded-2xl font-bold text-sm transition-all duration-200 hover:scale-105 active:scale-95"
          style={{ background: T.panel, color: T.ink, border: `1px solid ${T.line}` }}
        >
          Anotador
        </Link>
      </div>
    </div>
  );
}
