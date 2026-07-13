"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "../../../lib/theme";
import { supabase } from "../../../lib/supabaseClient";
import ThemeToggleButton from "../../../components/ThemeToggleButton";
import SuitIcon from "../../../components/SuitIcon";

export default function AccesoOrganizador() {
  const { T } = useTheme();
  const router = useRouter();
  const [modo, setModo] = useState("link"); // "link" | "clave"
  const [enviado, setEnviado] = useState(false);
  const [email, setEmail] = useState("");
  const [nombre, setNombre] = useState("");
  const [clave, setClave] = useState("");
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

  async function entrarConClave() {
    if (!email.trim() || !clave.trim()) {
      setError("Ingresá tu email y tu contraseña.");
      return;
    }
    setError("");
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: clave,
    });
    setLoading(false);
    if (err) {
      setError("Email o contraseña incorrectos. Si todavía no configuraste una contraseña, entrá con el link y configurala desde tu panel.");
      return;
    }
    router.push("/organizador/panel");
  }

  return (
    <div className="min-h-screen transition-colors duration-500" style={{ background: T.bg }}>
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="flex justify-between mb-4">
          <Link href="/" className="text-xs underline" style={{ color: T.inkDim }}>
            ← Inicio
          </Link>
          <ThemeToggleButton />
        </div>
        <div className="flex justify-center mb-2">
          <SuitIcon suit="espada" size={22} />
        </div>
        <h1 className="text-2xl font-black text-center mb-1" style={{ color: T.ink, fontFamily: "Georgia, serif" }}>
          Acceso organizadores
        </h1>

        <div className="flex rounded-2xl overflow-hidden border my-4" style={{ borderColor: T.gold }}>
          <button
            onClick={() => { setModo("link"); setError(""); }}
            className="flex-1 py-2.5 text-sm font-bold transition-colors duration-200"
            style={{ background: modo === "link" ? T.gold : "transparent", color: modo === "link" ? T.ink : T.inkDim }}
          >
            Con link (mail)
          </button>
          <button
            onClick={() => { setModo("clave"); setError(""); }}
            className="flex-1 py-2.5 text-sm font-bold transition-colors duration-200"
            style={{ background: modo === "clave" ? T.gold : "transparent", color: modo === "clave" ? T.ink : T.inkDim }}
          >
            Con contraseña
          </button>
        </div>

        {modo === "link" ? (
          <>
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
          </>
        ) : (
          <>
            <p className="text-center text-sm mb-6" style={{ color: T.inkDim }}>
              Para varios dispositivos en el mismo bar, sin depender del mail cada vez. La contraseña se configura desde "Mi panel", después de entrar la primera vez con el link.
            </p>
            <div className="rounded-2xl p-4 border shadow-sm" style={{ background: T.panel, borderColor: T.line }}>
              <div className="flex flex-col gap-2">
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  type="email"
                  className="px-3 py-2 rounded-xl text-sm"
                  style={{ background: T.bg, color: T.ink, border: `1px solid ${T.line}` }}
                />
                <input
                  value={clave}
                  onChange={(e) => setClave(e.target.value)}
                  placeholder="Contraseña"
                  type="password"
                  className="px-3 py-2 rounded-xl text-sm"
                  style={{ background: T.bg, color: T.ink, border: `1px solid ${T.line}` }}
                />
                <button
                  onClick={entrarConClave}
                  disabled={loading}
                  className="py-2 rounded-xl font-bold text-sm transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-60"
                  style={{ background: T.gold, color: T.ink }}
                >
                  {loading ? "Entrando…" : "Entrar"}
                </button>
              </div>
            </div>
          </>
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
