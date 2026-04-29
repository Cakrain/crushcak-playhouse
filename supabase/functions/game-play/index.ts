// Unified game engine for MinesCak, BlackCak, PlincoCak, LimboCak, RokketCak, BalloonCak.
// Provably-fair: server seed (sha256 commit), client seed, nonce. Wallet debit on start, credit on settle.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const HOUSE_EDGE = 0.04;

type GameKind = "minescak" | "blackcak" | "plincocak" | "limbocak" | "rokketcak" | "ballooncak";

interface PendingBase {
  game: GameKind;
  bet: number;
  seed: string;
  seedHash: string;
  clientSeed: string;
  nonce: number;
  startedAt: number;
  ended?: boolean;
  // game-specific
  data: Record<string, unknown>;
}

const pending = new Map<string, PendingBase>(); // key: `${userId}:${nonce}`

// ---------- crypto helpers ----------
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
// stream of floats in [0,1) derived from HMAC(serverSeed, `${clientSeed}:${nonce}:${cursor}`)
async function rngStream(serverSeed: string, clientSeed: string, nonce: number) {
  let cursor = 0;
  let buffer: number[] = [];
  return async (): Promise<number> => {
    if (buffer.length === 0) {
      const hex = await hmacHex(serverSeed, `${clientSeed}:${nonce}:${cursor++}`);
      // 8 floats from a 64-hex string (8 bytes per float)
      for (let i = 0; i < 8; i++) {
        const slice = hex.slice(i * 8, i * 8 + 8);
        buffer.push(parseInt(slice, 16) / 0x100000000);
      }
    }
    return buffer.shift()!;
  };
}

// ---------- game logic ----------
async function pickMines(rng: () => Promise<number>, mineCount: number): Promise<number[]> {
  const tiles = Array.from({ length: 25 }, (_, i) => i);
  // Fisher-Yates with rng
  for (let i = tiles.length - 1; i > 0; i--) {
    const j = Math.floor((await rng()) * (i + 1));
    [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
  }
  return tiles.slice(0, mineCount).sort((a, b) => a - b);
}

// Mines multiplier formula: ((25 - mines) / (25 - mines - revealed)) cumulative * (1-edge)
function minesMultiplier(mines: number, revealed: number): number {
  if (revealed === 0) return 1;
  let m = 1;
  for (let i = 0; i < revealed; i++) {
    m *= (25 - i) / (25 - mines - i);
  }
  return m * (1 - HOUSE_EDGE);
}

async function deriveLimbo(rng: () => Promise<number>): Promise<number> {
  const r = await rng();
  if (r < HOUSE_EDGE) return 1.0;
  return Math.max(1.0, Math.min((1 - HOUSE_EDGE) / (1 - r), 1_000_000));
}

async function deriveCrash(rng: () => Promise<number>): Promise<number> {
  const r = await rng();
  if (r < HOUSE_EDGE) return 1.0;
  return Math.max(1.0, Math.min((1 - HOUSE_EDGE) / (1 - r), 1000));
}

async function deriveBalloonPop(rng: () => Promise<number>): Promise<number> {
  // pop multiplier 1.0 .. ~10 with house edge
  const r = await rng();
  if (r < HOUSE_EDGE) return 1.0;
  return Math.max(1.0, Math.min((1 - HOUSE_EDGE) / (1 - r), 50));
}

// Plinko: ball drops through `rows` pegs, each peg picks left/right (+/-1).
// Final slot = number of right moves (0..rows). Multipliers depend on risk.
const PLINKO_ROWS = 12;
const PLINKO_MULTIPLIERS: Record<"low" | "medium" | "high", number[]> = {
  // 13 slots for 12 rows. Symmetric. House edge baked in.
  low:    [10, 3, 1.4, 1.1, 1, 0.9, 0.7, 0.9, 1, 1.1, 1.4, 3, 10],
  medium: [22, 5, 2, 1.2, 0.9, 0.7, 0.4, 0.7, 0.9, 1.2, 2, 5, 22],
  high:   [60, 14, 4, 1.4, 0.6, 0.3, 0.2, 0.3, 0.6, 1.4, 4, 14, 60],
};
async function plinkoDrop(rng: () => Promise<number>): Promise<{ path: number[]; slot: number }> {
  const path: number[] = [];
  let slot = 0;
  for (let i = 0; i < PLINKO_ROWS; i++) {
    const r = (await rng()) < 0.5 ? 0 : 1;
    path.push(r);
    slot += r;
  }
  return { path, slot };
}

// Blackjack
type Card = { r: number; s: number }; // r=1..13 (1=A), s=0..3
function cardValue(r: number): number { return r === 1 ? 11 : r >= 10 ? 10 : r; }
function handTotal(hand: Card[]): { total: number; soft: boolean } {
  let total = hand.reduce((a, c) => a + cardValue(c.r), 0);
  let aces = hand.filter((c) => c.r === 1).length;
  let soft = aces > 0 && total <= 21;
  while (total > 21 && aces > 0) { total -= 10; aces--; soft = false; }
  return { total, soft: soft && aces > 0 };
}
async function drawCard(rng: () => Promise<number>): Promise<Card> {
  const r = Math.floor((await rng()) * 13) + 1;
  const s = Math.floor((await rng()) * 4);
  return { r, s };
}
async function dealerPlay(hand: Card[], rng: () => Promise<number>): Promise<Card[]> {
  while (true) {
    const { total, soft } = handTotal(hand);
    if (total > 21) return hand;
    if (total >= 17 && !(soft && total === 17)) return hand; // hits soft 17
    hand.push(await drawCard(rng));
  }
}

// ---------- wallet helpers ----------
async function debit(admin: ReturnType<typeof createClient>, userId: string, amount: number) {
  const { data } = await admin.from("wallets").select("balance").eq("user_id", userId).maybeSingle();
  const bal = data ? Number(data.balance) : 0;
  if (amount > bal) return { ok: false, balance: bal };
  await admin.from("wallets").update({ balance: bal - amount }).eq("user_id", userId);
  return { ok: true, balance: bal - amount };
}
async function credit(admin: ReturnType<typeof createClient>, userId: string, amount: number) {
  const { data } = await admin.from("wallets").select("balance").eq("user_id", userId).maybeSingle();
  const bal = data ? Number(data.balance) : 0;
  await admin.from("wallets").update({ balance: bal + amount }).eq("user_id", userId);
  return bal + amount;
}

async function recordHistory(
  admin: ReturnType<typeof createClient>,
  userId: string,
  game: GameKind,
  betAmount: number,
  multiplier: number,
  payout: number,
  won: boolean,
  serverSeedHash: string,
  nonce: number,
  metadata: unknown,
) {
  await admin.from("game_history").insert({
    user_id: userId,
    game,
    bet_amount: betAmount,
    multiplier,
    payout,
    won,
    server_seed_hash: serverSeedHash,
    nonce,
    metadata,
  });
}

// ---------- HTTP entry ----------
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);
    const token = authHeader.replace("Bearer ", "");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SERVICE_ROLE) {
      return json({ error: "server_misconfigured" }, 500);
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: u, error: uErr } = await userClient.auth.getUser(token);
    if (uErr || !u?.user?.id) return json({ error: "unauthorized" }, 401);
    const userId = u.user.id;

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const body = await req.json().catch(() => ({}));
    const game = String(body.game ?? "") as GameKind;
    const action = String(body.action ?? "");

    // ---- START actions: debit + create round ----
    if (action === "start") {
      const bet = Number(body.bet_amount);
      if (!Number.isFinite(bet) || bet <= 0 || bet > 10000) return json({ error: "invalid_bet" }, 400);
      const clientSeed = String(body.client_seed ?? crypto.randomUUID()).slice(0, 64);

      const debitRes = await debit(admin, userId, bet);
      if (!debitRes.ok) return json({ error: "insufficient" }, 400);

      const serverSeed = crypto.randomUUID() + crypto.randomUUID();
      const seedHash = await sha256Hex(serverSeed);
      const nonce = Math.floor(Math.random() * 1_000_000_000);
      const rng = await rngStream(serverSeed, clientSeed, nonce);

      const round: PendingBase = {
        game, bet, seed: serverSeed, seedHash, clientSeed, nonce, startedAt: Date.now(), data: {},
      };

      // Game-specific pre-roll
      if (game === "minescak") {
        const mines = Math.max(1, Math.min(24, Math.floor(Number(body.mines) || 3)));
        const positions = await pickMines(rng, mines);
        round.data = { mines, positions, revealed: [] as number[] };
      } else if (game === "limbocak") {
        const target = Number(body.target);
        if (!Number.isFinite(target) || target < 1.01 || target > 1_000_000) {
          return json({ error: "invalid_target" }, 400);
        }
        const result = await deriveLimbo(rng);
        const won = result >= target;
        const payout = won ? bet * target : 0;
        if (payout > 0) await credit(admin, userId, payout);
        await recordHistory(admin, userId, game, bet, won ? target : 0, payout, won, seedHash, nonce, {
          target, result, server_seed: serverSeed,
        });
        return json({
          success: true,
          server_seed_hash: seedHash, server_seed: serverSeed,
          nonce, result, target, won, payout,
        });
      } else if (game === "plincocak") {
        const risk = (["low", "medium", "high"].includes(body.risk) ? body.risk : "medium") as
          "low" | "medium" | "high";
        const { path, slot } = await plinkoDrop(rng);
        const mult = PLINKO_MULTIPLIERS[risk][slot];
        const payout = bet * mult;
        if (payout > 0) await credit(admin, userId, payout);
        await recordHistory(admin, userId, game, bet, mult, payout, mult >= 1, seedHash, nonce, {
          risk, path, slot, server_seed: serverSeed,
        });
        return json({
          success: true,
          server_seed_hash: seedHash, server_seed: serverSeed,
          nonce, path, slot, multiplier: mult, payout, risk,
          multipliers: PLINKO_MULTIPLIERS[risk],
        });
      } else if (game === "rokketcak") {
        const crash = await deriveCrash(rng);
        round.data = { crash };
      } else if (game === "ballooncak") {
        const pop = await deriveBalloonPop(rng);
        round.data = { pop };
      } else if (game === "blackcak") {
        const player: Card[] = [await drawCard(rng), await drawCard(rng)];
        const dealer: Card[] = [await drawCard(rng), await drawCard(rng)];
        round.data = { player, dealer, doubled: false, finished: false, rngLeft: rng };
        // Save rng cursor by stashing fn? Cannot serialize; we'll regenerate on hit/stand using a new seed instance.
        // Trick: store remaining "extra" cursor offset via counter — simpler: reuse the same rng closure via Map.
        rngStore.set(`${userId}:${nonce}`, rng);
        const pT = handTotal(player).total;
        const dUp = dealer[0];
        // natural blackjack check
        if (pT === 21) {
          const dT = handTotal(dealer).total;
          let won = true, push = false, mult = 2.5;
          if (dT === 21) { push = true; mult = 1; }
          const payout = bet * mult;
          await credit(admin, userId, payout);
          await recordHistory(admin, userId, "blackcak", bet, mult, payout, won && !push, seedHash, nonce, {
            player, dealer, blackjack: true, push, server_seed: serverSeed,
          });
          rngStore.delete(`${userId}:${nonce}`);
          return json({
            success: true, server_seed_hash: seedHash, server_seed: serverSeed,
            nonce, player, dealer, finished: true, outcome: push ? "push" : "blackjack", payout,
          });
        }
        pending.set(`${userId}:${nonce}`, round);
        return json({
          success: true, server_seed_hash: seedHash, nonce,
          player, dealer_up: dUp, // hide hole card
        });
      }

      // For mines / rokket / balloon, store and return
      pending.set(`${userId}:${nonce}`, round);
      return json({
        success: true, server_seed_hash: seedHash, nonce,
        ...(game === "minescak" ? { mines: (round.data as any).mines } : {}),
      });
    }

    // ---- ACTION endpoints (mid-round) ----
    const nonce = Number(body.nonce);
    const key = `${userId}:${nonce}`;
    const round = pending.get(key);
    if (!round || round.ended) return json({ error: "round_not_found" }, 404);

    if (game === "minescak") {
      const data = round.data as { mines: number; positions: number[]; revealed: number[] };
      if (action === "reveal") {
        const tile = Math.max(0, Math.min(24, Math.floor(Number(body.tile))));
        if (data.revealed.includes(tile)) return json({ error: "already_revealed" }, 400);
        if (data.positions.includes(tile)) {
          // BOOM
          round.ended = true;
          await recordHistory(admin, userId, "minescak", round.bet, 0, 0, false, round.seedHash, nonce, {
            mines: data.mines, positions: data.positions, revealed: data.revealed, hit: tile,
            server_seed: round.seed,
          });
          pending.delete(key);
          return json({
            success: true, hit_mine: true, tile,
            mine_positions: data.positions, server_seed: round.seed,
          });
        }
        data.revealed.push(tile);
        const m = minesMultiplier(data.mines, data.revealed.length);
        return json({
          success: true, hit_mine: false, tile,
          revealed: data.revealed, multiplier: m, potential_payout: round.bet * m,
        });
      }
      if (action === "cashout") {
        if (data.revealed.length === 0) return json({ error: "nothing_revealed" }, 400);
        const m = minesMultiplier(data.mines, data.revealed.length);
        const payout = round.bet * m;
        await credit(admin, userId, payout);
        round.ended = true;
        await recordHistory(admin, userId, "minescak", round.bet, m, payout, true, round.seedHash, nonce, {
          mines: data.mines, positions: data.positions, revealed: data.revealed, server_seed: round.seed,
        });
        pending.delete(key);
        return json({
          success: true, payout, multiplier: m,
          mine_positions: data.positions, server_seed: round.seed,
        });
      }
    }

    if (game === "rokketcak") {
      const data = round.data as { crash: number };
      if (action === "cashout") {
        const at = Number(body.cashed_at);
        const won = Number.isFinite(at) && at > 1 && at < data.crash;
        const m = won ? at : data.crash;
        const payout = won ? round.bet * m : 0;
        if (payout > 0) await credit(admin, userId, payout);
        round.ended = true;
        await recordHistory(admin, userId, "rokketcak", round.bet, m, payout, won, round.seedHash, nonce, {
          crash: data.crash, cashed_at: at, server_seed: round.seed,
        });
        pending.delete(key);
        return json({ success: true, won, crash: data.crash, payout, server_seed: round.seed });
      }
      if (action === "reveal") {
        // Client requesting crash for animation completion
        return json({ success: true, crash: data.crash });
      }
    }

    if (game === "ballooncak") {
      const data = round.data as { pop: number };
      if (action === "cashout") {
        const at = Number(body.cashed_at);
        const won = Number.isFinite(at) && at > 1 && at < data.pop;
        const m = won ? at : data.pop;
        const payout = won ? round.bet * m : 0;
        if (payout > 0) await credit(admin, userId, payout);
        round.ended = true;
        await recordHistory(admin, userId, "ballooncak", round.bet, m, payout, won, round.seedHash, nonce, {
          pop: data.pop, cashed_at: at, server_seed: round.seed,
        });
        pending.delete(key);
        return json({ success: true, won, pop: data.pop, payout, server_seed: round.seed });
      }
      if (action === "reveal") {
        return json({ success: true, pop: data.pop });
      }
    }

    if (game === "blackcak") {
      const data = round.data as { player: Card[]; dealer: Card[]; doubled: boolean; finished: boolean };
      const rng = rngStore.get(key);
      if (!rng) return json({ error: "round_lost" }, 500);

      async function settleBJ(outcome: "win" | "lose" | "push" | "bust", multBase = 2) {
        const { player, dealer, doubled } = data;
        const stake = doubled ? round.bet * 2 : round.bet;
        let payout = 0; let mult = 0;
        if (outcome === "win") { payout = stake * multBase; mult = multBase; }
        else if (outcome === "push") { payout = stake; mult = 1; }
        if (outcome === "win" || outcome === "push") await credit(admin, userId, payout);
        // If doubled, debit extra
        round.ended = true;
        rngStore.delete(key);
        pending.delete(key);
        await recordHistory(admin, userId, "blackcak", stake, mult, payout, outcome === "win", round.seedHash, nonce, {
          player, dealer, outcome, doubled, server_seed: round.seed,
        });
        return { player, dealer, outcome, payout, mult, server_seed: round.seed };
      }

      if (action === "hit") {
        data.player.push(await drawCard(rng));
        const t = handTotal(data.player).total;
        if (t > 21) {
          const r = await settleBJ("bust", 0);
          return json({ success: true, finished: true, outcome: "bust", ...r });
        }
        return json({ success: true, finished: false, player: data.player });
      }
      if (action === "stand" || action === "double") {
        if (action === "double") {
          if (data.player.length !== 2) return json({ error: "cannot_double" }, 400);
          const dRes = await debit(admin, userId, round.bet);
          if (!dRes.ok) return json({ error: "insufficient" }, 400);
          data.doubled = true;
          data.player.push(await drawCard(rng));
        }
        const playerTotal = handTotal(data.player).total;
        if (playerTotal > 21) {
          const r = await settleBJ("bust", 0);
          return json({ success: true, finished: true, outcome: "bust", ...r });
        }
        await dealerPlay(data.dealer, rng);
        const dT = handTotal(data.dealer).total;
        let outcome: "win" | "lose" | "push" = "lose";
        if (dT > 21 || playerTotal > dT) outcome = "win";
        else if (playerTotal === dT) outcome = "push";
        const r = await settleBJ(outcome, outcome === "win" ? 2 : 1);
        return json({ success: true, finished: true, outcome, ...r });
      }
    }

    return json({ error: "unknown_action" }, 400);
  } catch (e) {
    console.error("game-play error", e);
    return json({ error: "server_error", detail: String(e) }, 500);
  }
});

// blackjack RNG continuation cache
const rngStore = new Map<string, () => Promise<number>>();

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
