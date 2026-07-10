"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useTheme } from "../../../lib/theme";
import { supabase } from "../../../lib/supabaseClient";
import ThemeToggleButton from "../../../components/ThemeToggleButton";
import SuitIcon from "../../../components/SuitIcon";

export default function AccesoOrganizador() {
  const { T } = useTheme();
  const [enviado, setEnviado] = useState(false);
  const [email, setEmail] = useState("");
  const [nombre, setNombre] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function enviarLink() {
    if (!email.trim()) {
      setError("Ingresá tu email.");
      return;
    }
    setError("");
    setLoading(true);
    const redirectTo = `${window.location.origin}/organizador/panel`;
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true, data: { nombre: nombre.trim() }, emailRedirectTo: redirectTo },
    });
    setLoading(false);
    if (err) {
      setError("No se pudo enviar el link. Probá de nuevo en un minuto.");
      return;
    }
    setEnviado(true);
  }

  return (
    <div className="min-h-screen transition-colors duration-500" style={{ background: T.bg }}>
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="flex justify-between mb-4">
          <Link href="/" className="text-xs underline" style={{ color: T.inkDim }}>
            ← inicio
          </Link>
          <ThemeToggleButton />
        </div>
        <div className="flex justify-center mb-2">
          <SuitIcon suit="espada" size={22} />
        </div>
        <h1 className="text-2xl font-black text-center mb-1" style={{ color: T.ink, fontFamily: "Georgia, serif" }}>
          Acceso organizadores
        </h1>
        <p className="text-center text-sm mb-6" style={{ color: T.inkDim }}>
          {enviado
            ? `Te mandamos un mail a ${email}. Abrilo y tocá el link — con eso quedás adentro. Puede tardar un minuto, revisá spam.`
            : "Ingresá tu email — te mandamos un link para entrar, sin contraseña."}
        </p>

        {!enviado && (
          <div className="rounded-2xl p-4 border shadow-sm" style={{ background: T.panel, borderColor: T.line }}>
            <div className="flex flex-col gap-2">
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Nombre del bar / organizador"
                className="px-3 py-2 rounded-xl text-sm"
                style={{ background: T.bg, color: T.ink, border: `1px solid ${T.line}` }}
              />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                type="email"
                className="px-3 py-2 rounded-xl text-sm"
                style={{ background: T.bg, color: T.ink, border: `1px solid ${T.line}` }}
              />
              <button
                onClick={enviarLink}
                disabled={loading}
                className="py-2 rounded-xl font-bold text-sm transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-60"
                style={{ background: T.gold, color: T.ink }}
              >
                {loading ? "Enviando…" : "Enviarme el link"}
              </button>
            </div>
          </div>
        )}

        {enviado && (
          <button onClick={() => setEnviado(false)} className="w-full text-center text-xs underline mt-2" style={{ color: T.inkDim }}>
            usar otro email
          </button>
        )}

        {error && (
          <p className="text-sm text-center mt-3" style={{ color: T.goldBright }}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
