// Wallet actions: simulate_deposit (demo) + withdraw (creates pending transaction, debits balance).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabase.auth.getUser(token);
    if (!userData?.user?.id) return json({ error: "unauthorized" }, 401);
    const userId = userData.user.id;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");
    const amount = Number(body.amount);

    if (!Number.isFinite(amount) || amount <= 0) return json({ error: "invalid_amount" }, 400);

    const { data: wallet } = await admin.from("wallets").select("balance").eq("user_id", userId).maybeSingle();
    const balance = wallet ? Number(wallet.balance) : 0;

    if (action === "simulate_deposit") {
      if (amount > 100000) return json({ error: "amount_too_large" }, 400);
      const newBal = balance + amount;
      const { error } = await admin.from("wallets").update({ balance: newBal }).eq("user_id", userId);
      if (error) return json({ error: error.message }, 500);
      await admin.from("transactions").insert({
        user_id: userId, type: "deposit", amount, status: "completed",
        notes: "Simulated demo deposit",
      });
      return json({ success: true, balance: newBal });
    }

    if (action === "withdraw") {
      const dest = String(body.destination_address ?? "");
      if (!/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(dest)) return json({ error: "invalid_address" }, 400);
      if (amount < 10) return json({ error: "below_minimum" }, 400);
      if (amount > balance) return json({ error: "insufficient" }, 400);

      const newBal = balance - amount;
      const { error } = await admin.from("wallets").update({ balance: newBal }).eq("user_id", userId);
      if (error) return json({ error: error.message }, 500);
      await admin.from("transactions").insert({
        user_id: userId, type: "withdrawal", amount, status: "pending",
        destination_address: dest,
        notes: "Awaiting manual processing",
      });
      return json({ success: true, balance: newBal });
    }

    return json({ error: "unknown_action" }, 400);
  } catch (e) {
    console.error("wallet-action error", e);
    return json({ error: "server_error" }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
