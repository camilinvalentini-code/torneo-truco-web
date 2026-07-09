import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// En build (sin las env vars todavía) esto no debe explotar: usamos valores
// dummy para que `next build` compile igual. En el navegador, con las env vars
// reales cargadas en Vercel, se conecta de verdad.
export const supabase = createClient(
  url || "https://placeholder.supabase.co",
  key || "placeholder-anon-key"
);
