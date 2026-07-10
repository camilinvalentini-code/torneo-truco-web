"use client";
import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "../../../lib/theme";
import { useAuth } from "../../../lib/useAuth";
import ThemeToggleButton from "../../../components/ThemeToggleButton";
import SuitIcon from "../../../components/SuitIcon";

export default function Pendiente() {
  const { T } = useTheme();
  const router = useRouter();
  const { session, profile, loading, salir, refreshProfile } = useAuth();

  async function revisar() {
    await refreshProfile();
    if (profile?.status === "aprobado") {
      router.push(profile.role === "admin" ? "/admin/panel" : "/organizador/panel");
    }
  }

  if (loading) return null;
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-6" style={{ color: "#33453E" }}>
        <div>
          No hay sesión activa. <Link href="/organizador/acceso" className="underline">Entrar</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen transition-colors duration-500" style={{ background: T.bg }}>
      <div className="max-w-md mx-auto px-4 py-10">
        <div className="flex justify-end mb-4">
          <ThemeToggleButton />
        </div>
        <div className="flex justify-center mb-3">
          <SuitIcon suit="oro" size={26} />
        </div>
        <h1 className="text-xl font-black text-center mb-2" style={{ color: T.ink, fontFamily: "Georgia, serif" }}>
          Cuenta en revisión
        </h1>
        <p className="text-center text-sm mb-6" style={{ color: T.inkDim }}>
          Ya recibimos tu registro ({profile?.email}). Un admin tiene que aprobarte antes de que puedas crear
          torneos — normalmente es rápido. Avisale directamente si tenés apuro.
        </p>
        <button
          onClick={revisar}
          className="w-full py-3 rounded-2xl font-bold text-sm mb-3 transition-all duration-200 hover:scale-105 active:scale-95"
          style={{ background: T.gold, color: T.ink }}
        >
          Ya me aprobaron, revisar de nuevo
        </button>
        <button onClick={salir} className="w-full text-center text-xs underline" style={{ color: T.inkDim }}>
          cerrar sesión
        </button>
      </div>
    </div>
  );
}
