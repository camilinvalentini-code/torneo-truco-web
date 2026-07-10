"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "./supabaseClient";

export function useAuth() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null);
      return;
    }
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    setProfile(data || null);
  }, []);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      await loadProfile(data.session?.user?.id);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      loadProfile(newSession?.user?.id);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  async function salir() {
    await supabase.auth.signOut();
  }

  return { session, profile, loading, salir, refreshProfile: () => loadProfile(session?.user?.id) };
}
