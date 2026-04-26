// CakPlain (Crash) — provably fair RNG.
// "start" debits bet, returns crash_point + server_seed_hash.
// "settle" credits payout (or 0) and writes game_history.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const HOUSE_EDGE = 0.04; // 4% house edge

// In-memory pending rounds keyed by user_id + nonce (ephemeral; OK for demo).
// Production should persist to a table.
const pending = new Map<string, { bet: number; crash: number; seed: string; nonce: number }>();

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmacHex(key: string, msg: string): Promise<string> {
  const k = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(key),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(msg));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Standard crash math: crashPoint = max(1, (1-edge) / (1 - r)), r in [0,1).
async function deriveCrash(serverSeed: string, clientSeed: string, nonce: number): Promise<number> {
  const hex = await hmacHex(serverSeed, `${clientSeed}:${nonce}`);
  const slice = hex.slice(0, 13); // 52 bits
  const r = parseInt(slice, 16) / Math.pow(2, 52);
  if (r < HOUSE_EDGE) return 1.0; // instant crash
  const crash = (1 - HOUSE_EDGE) / (1 - r);
  return Math.max(1.0, Math.min(crash, 1000));
}

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

    if (action === "start") {
      const bet = Number(body.bet_amount);
      const clientSeed = String(body.client_seed ?? "").slice(0, 64) || "default";
      if (!Number.isFinite(bet) || bet <= 0 || bet > 10000) return json({ error: "invalid_bet" }, 400);

      const { data: wallet } = await admin.from("wallets").select("balance").eq("user_id", userId).maybeSingle();
      const bal = wallet ? Number(wallet.balance) : 0;
      if (bet > bal) return json({ error: "insufficient" }, 400);

      // Debit
      const newBal = bal - bet;
      await admin.from("wallets").update({ balance: newBal }).eq("user_id", userId);

      // Generate server seed + nonce
      const serverSeed = crypto.randomUUID() + crypto.randomUUID();
      const serverSeedHash = await sha256Hex(serverSeed);
      const nonce = Math.floor(Math.random() * 1_000_000_000);
      const crash = await deriveCrash(serverSeed, clientSeed, nonce);

      pending.set(`${userId}:${nonce}`, { bet, crash, seed: serverSeed, nonce });

      return json({
        success: true,
        crash_point: crash,
        server_seed_hash: serverSeedHash,
        nonce,
      });
    }

    if (action === "settle") {
      const nonce = Number(body.nonce);
      const cashedAt = body.cashed_at == null ? null : Number(body.cashed_at);
      const key = `${userId}:${nonce}`;
      const round = pending.get(key);
      if (!round) return json({ error: "round_not_found" }, 404);
      pending.delete(key);

      const won = cashedAt != null && cashedAt < round.crash;
      const finalMultiplier = won ? Math.min(cashedAt!, round.crash) : round.crash;
      const payout = won ? round.bet * finalMultiplier : 0;

      if (payout > 0) {
        const { data: w } = await admin.from("wallets").select("balance").eq("user_id", userId).maybeSingle();
        const bal = w ? Number(w.balance) : 0;
        await admin.from("wallets").update({ balance: bal + payout }).eq("user_id", userId);
        await admin.from("transactions").insert({
          user_id: userId, type: "win", amount: payout, status: "completed",
          notes: `CakPlain @ ${finalMultiplier.toFixed(2)}x`,
        });
      }

      await admin.from("game_history").insert({
        user_id: userId,
        game: "cakplain",
        bet_amount: round.bet,
        multiplier: finalMultiplier,
        payout,
        won,
        server_seed_hash: await sha256Hex(round.seed),
        nonce: round.nonce,
        metadata: { server_seed: round.seed, crash_point: round.crash },
      });

      return json({ success: true, won, payout });
    }

    return json({ error: "unknown_action" }, 400);
  } catch (e) {
    console.error("game-cakplain error", e);
    return json({ error: "server_error" }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
