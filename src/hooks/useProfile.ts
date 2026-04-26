import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/auth/AuthProvider";

export interface Profile {
  id: string;
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  national_id: string | null;
  date_of_birth: string | null;
  gender: string | null;
  phone: string | null;
  country: string | null;
  theme: "lacivert" | "siyah" | "mavi" | "su_yesili";
  language: "tr" | "en";
  trx_deposit_address: string;
}

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
    setProfile(data as Profile | null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { profile, loading, refresh };
}

export function useWallet() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setBalance(0);
      setLoading(false);
      return;
    }
    const { data } = await supabase.from("wallets").select("balance").eq("user_id", user.id).maybeSingle();
    setBalance(data ? Number(data.balance) : 0);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();

    if (!user) return;
    // Unique channel name per mount avoids "callbacks after subscribe()" in StrictMode double-invoke.
    const channel = supabase.channel(`wallet-${user.id}-${Math.random().toString(36).slice(2)}`);
    channel
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "wallets", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const next = (payload.new as { balance: number | string }).balance;
          if (next != null) setBalance(Number(next));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refresh]);

  return { balance, loading, refresh };
}
