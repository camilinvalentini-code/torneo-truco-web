"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTheme } from "../../../lib/theme";
import { supabase } from "../../../lib/supabaseClient";
import ThemeToggleButton from "../../../components/ThemeToggleButton";
import SuitIcon from "../../../components/SuitIcon";

export default function AccesoOrganizador() {
  const { T } = useTheme();
  const router = useRouter();
  const [paso, setPaso] = useState("email"); // "email" | "codigo"
  const [email, setEmail] = useState("");
  const [nombre, setNombre] = useState("");
  const [codigo, setCodigo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function pedirCodigo() {
    if (!email.trim()) {
      setError("Ingresá tu email.");
      return;
    }
    setError("");
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true, data: { nombre: nombre.trim() } },
    });
    setLoading(false);
    if (err) {
      setError("No se pudo enviar el código. Probá de nuevo en un minuto.");
      return;
    }
    setPaso("codigo");
  }

  async function verificarCodigo() {
    if (!codigo.trim()) return;
    setError("");
    setLoading(true);
    const { data, error: err } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: codigo.trim(),
      type: "email",
    });
    setLoading(false);
    if (err || !data.session) {
      setError("Código incorrecto o vencido. Pedí uno nuevo.");
      return;
    }

    const { data: perfil } = await supabase.from("profiles").select("*").eq("id", data.session.user.id).single();
    if (perfil?.role === "admin" && perfil?.status === "aprobado") {
      router.push("/admin/panel");
    } else if (perfil?.status === "aprobado") {
      router.push("/organizador/panel");
    } else {
      router.push("/organizador/pendiente");
    }
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
          {paso === "email"
            ? "Ingresá tu email — te mandamos un código para entrar, sin contraseña."
            : `Te enviamos un código a ${email}. Puede tardar un minuto y revisá spam.`}
        </p>

        <div className="rounded-2xl p-4 border shadow-sm" style={{ background: T.panel, borderColor: T.line }}>
          {paso === "email" ? (
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
                onClick={pedirCodigo}
                disabled={loading}
                className="py-2 rounded-xl font-bold text-sm transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-60"
                style={{ background: T.gold, color: T.ink }}
              >
                {loading ? "Enviando…" : "Enviarme el código"}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <input
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="Código de 6 dígitos"
                inputMode="numeric"
                className="px-3 py-2 rounded-xl text-sm text-center tracking-widest text-lg font-bold"
                style={{ background: T.bg, color: T.ink, border: `1px solid ${T.line}` }}
              />
              <button
                onClick={verificarCodigo}
                disabled={loading}
                className="py-2 rounded-xl font-bold text-sm transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-60"
                style={{ background: T.gold, color: T.ink }}
              >
                {loading ? "Verificando…" : "Entrar"}
              </button>
              <button onClick={() => setPaso("email")} className="text-xs underline mt-1" style={{ color: T.inkDim }}>
                usar otro email
              </button>
            </div>
          )}
        </div>

        {error && (
          <p className="text-sm text-center mt-3" style={{ color: T.goldBright }}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
