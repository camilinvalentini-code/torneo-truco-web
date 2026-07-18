import { redirect, notFound } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

export default async function LinkCorto({ params }) {
  const { slug } = params;
  const { data: torneoId } = await supabase.rpc("torneo_por_slug", { p_slug: slug.toLowerCase() });
  if (!torneoId) notFound();
  redirect(`/torneo/${torneoId}`);
}
