import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plane, Loader2, RefreshCw, History as HistoryIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/auth/AuthProvider";
import { useWallet } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { playSound, stopAll } from "@/lib/sounds";
import { formatMultiplier, formatTrx } from "@/lib/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Phase = "idle" | "starting" | "flight" | "crashed" | "cashed";

interface RoundResult {
  crash: number;
  serverSeedHash: string;
  nonce: number;
  clientSeed: string;
  payout: number;
  cashedAt: number | null;
}

export function CakPlainGame() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { balance, refresh } = useWallet();

  const [betAmount, setBetAmount] = useState("10");
  const [autoCashout, setAutoCashout] = useState("2.00");
  const [autoBet, setAutoBet] = useState(false);

  const [phase, setPhase] = useState<Phase>("idle");
  const [multiplier, setMultiplier] = useState(1.0);
  const [round, setRound] = useState<RoundResult | null>(null);
  const [history, setHistory] = useState<{ crash: number; won: boolean }[]>([]);
  const [busy, setBusy] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const startTsRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const humStopRef = useRef<{ stop: () => void } | null>(null);
  const cashedAtRef = useRef<number | null>(null);
  const roundRef = useRef<RoundResult | null>(null);

  const stopLoop = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  };

  const cleanup = useCallback(() => {
    stopLoop();
    if (humStopRef.current) {
      humStopRef.current.stop();
      humStopRef.current = null;
    }
    stopAll();
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const settle = useCallback(
    async (cashed: number | null) => {
      const r = roundRef.current;
      if (!r) return;
      const won = cashed != null;
      cashedAtRef.current = cashed;
      cleanup();

      if (won) {
        setPhase("cashed");
        playSound("cashout");
        playSound("win");
      } else {
        setPhase("crashed");
        playSound("crash");
        playSound("lose");
      }

      // Send settlement to backend
      try {
        const { data } = await supabase.functions.invoke("game-cakplain", {
          body: { action: "settle", nonce: r.nonce, cashed_at: cashed },
        });
        if (data?.success) {
          refresh();
        }
      } catch (e) {
        console.error("settle error", e);
      }

      setHistory((h) => [{ crash: r.crash, won }, ...h].slice(0, 20));

      if (autoBet) {
        setTimeout(() => placeBet(), 2500);
      }
    },
    [autoBet, cleanup, refresh],
  );

  const tick = useCallback(() => {
    const r = roundRef.current;
    if (!r) return;
    const elapsed = (performance.now() - startTsRef.current) / 1000;
    // Exponential growth: typical crash curve. Approx 1.07^t.
    const m = Math.pow(1.07, elapsed * 4);
    setMultiplier(m);

    const target = Number(autoCashout);
    if (Number.isFinite(target) && target >= 1.01 && cashedAtRef.current == null && m >= target && m < r.crash) {
      // auto cash out
      void settle(m);
      return;
    }

    if (m >= r.crash) {
      void settle(null);
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [autoCashout, settle]);

  const placeBet = useCallback(async () => {
    if (!user) {
      toast.error(t("common.error"));
      return;
    }
    const amt = Number(betAmount);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error(t("common.error"));
      return;
    }
    if (amt > balance) {
      toast.error(t("wallet.insufficient"));
      return;
    }
    setBusy(true);
    setPhase("starting");
    setCountdown(3);
    setMultiplier(1);
    cashedAtRef.current = null;

    try {
      const clientSeed = Math.random().toString(36).slice(2, 14);
      const { data, error } = await supabase.functions.invoke("game-cakplain", {
        body: { action: "start", bet_amount: amt, client_seed: clientSeed },
      });
      if (error || !data?.success) {
        setBusy(false);
        setPhase("idle");
        toast.error(error?.message ?? data?.error ?? t("common.error"));
        return;
      }
      refresh();
      const r: RoundResult = {
        crash: Number(data.crash_point),
        serverSeedHash: data.server_seed_hash,
        nonce: data.nonce,
        clientSeed,
        payout: 0,
        cashedAt: null,
      };
      roundRef.current = r;
      setRound(r);
      setBusy(false);

      // Brief countdown then start
      let n = 3;
      const cdInterval = setInterval(() => {
        n -= 1;
        setCountdown(n);
        playSound("tick");
        if (n <= 0) {
          clearInterval(cdInterval);
          setPhase("flight");
          startTsRef.current = performance.now();
          humStopRef.current = playSound("hum", { loop: true, volume: 0.25 });
          rafRef.current = requestAnimationFrame(tick);
        }
      }, 700);
    } catch (e) {
      setBusy(false);
      setPhase("idle");
      console.error(e);
    }
  }, [betAmount, balance, refresh, t, tick, user]);

  const cashOut = () => {
    if (phase !== "flight" || cashedAtRef.current != null) return;
    void settle(multiplier);
  };

  // Dynamic plane position
  const planeX = phase === "flight" ? Math.min(80, (multiplier - 1) * 40) : phase === "crashed" ? 90 : 5;
  const planeY = phase === "flight" ? Math.min(70, (multiplier - 1) * 35) : phase === "crashed" ? -10 : 0;

  const colorClass =
    phase === "crashed" ? "text-destructive" : phase === "cashed" ? "text-success" : "text-primary";

  return (
    <div className="grid h-full gap-4 lg:grid-cols-[1fr_320px]">
      {/* GAME AREA */}
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-card shadow-elevated">
        {/* Star/grid background */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
          aria-hidden
        />

        {/* Trail curve */}
        {phase === "flight" && (
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <linearGradient id="trail" x1="0" y1="100%" x2="100%" y2="0">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.8" />
              </linearGradient>
            </defs>
            <path
              d={`M 5 95 Q ${planeX / 2} ${95 - planeY / 2}, ${planeX + 5} ${95 - planeY}`}
              fill="none"
              stroke="url(#trail)"
              strokeWidth="0.6"
            />
          </svg>
        )}

        {/* Plane */}
        <motion.div
          className="absolute"
          style={{ left: `${planeX}%`, bottom: `${planeY + 5}%` }}
          animate={
            phase === "crashed"
              ? { rotate: -75, y: 200, opacity: 0 }
              : phase === "flight"
              ? { rotate: -15 }
              : { rotate: 0 }
          }
          transition={{ duration: phase === "crashed" ? 0.6 : 0.2 }}
        >
          <div className={cn("relative", phase === "flight" && "drop-shadow-[0_0_20px_hsl(var(--primary))]")}>
            <Plane className={cn("h-12 w-12 md:h-16 md:w-16", colorClass)} strokeWidth={1.8} />
          </div>
        </motion.div>

        {/* Multiplier display */}
        <div className="relative flex h-full min-h-[280px] flex-col items-center justify-center p-8 md:min-h-[400px]">
          <AnimatePresence mode="wait">
            {phase === "starting" && (
              <motion.div
                key="starting"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="text-center"
              >
                <div className="text-sm uppercase tracking-widest text-muted-foreground">
                  {t("game.starting")}
                </div>
                <div className="mt-2 font-display text-7xl font-bold text-primary md:text-8xl">
                  {countdown > 0 ? countdown : "GO"}
                </div>
              </motion.div>
            )}
            {(phase === "flight" || phase === "crashed" || phase === "cashed") && (
              <motion.div
                key="m"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center"
              >
                <div className="text-xs uppercase tracking-widest text-muted-foreground">
                  {t("game.multiplier")}
                </div>
                <div className={cn("mt-1 font-display text-7xl font-bold tabular-nums md:text-9xl", colorClass)}>
                  {formatMultiplier(multiplier)}
                </div>
                {phase === "crashed" && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="mt-2 text-xl font-bold uppercase text-destructive"
                  >
                    💥 {t("game.crashed")}
                  </motion.div>
                )}
                {phase === "cashed" && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="mt-2 text-xl font-bold uppercase text-success"
                  >
                    ✓ {t("game.you_won")} +{(Number(betAmount) * (cashedAtRef.current ?? 1) - Number(betAmount)).toFixed(2)} TRX
                  </motion.div>
                )}
              </motion.div>
            )}
            {phase === "idle" && (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center text-muted-foreground"
              >
                <Plane className="mx-auto mb-3 h-10 w-10 opacity-50" />
                <div className="text-sm">{t("game.cakplain.desc")}</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* History strip */}
        <div className="flex gap-1.5 overflow-x-auto border-t border-border/60 bg-card/40 p-2">
          {history.length === 0 ? (
            <div className="px-2 text-xs text-muted-foreground">—</div>
          ) : (
            history.map((h, i) => (
              <span
                key={i}
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 font-mono text-xs",
                  h.crash >= 2 ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive",
                )}
              >
                {h.crash.toFixed(2)}x
              </span>
            ))
          )}
        </div>
      </div>

      {/* CONTROLS */}
      <div className="space-y-4">
        <div className="rounded-2xl border border-border/60 bg-gradient-card p-4 shadow-card">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              {t("game.bet_amount")} (TRX)
            </Label>
            <Input
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              disabled={phase !== "idle" && phase !== "crashed" && phase !== "cashed"}
              min="0.1"
              step="0.1"
            />
            <div className="flex gap-1.5">
              {[0.5, 2, 0.5, 2].map((mul, i) => (
                <button
                  key={i}
                  onClick={() => setBetAmount((b) => (Math.max(0.1, Number(b || 0) * mul)).toFixed(2))}
                  disabled={phase !== "idle" && phase !== "crashed" && phase !== "cashed"}
                  className="flex-1 rounded-md bg-card px-2 py-1 text-xs font-semibold hover:bg-muted disabled:opacity-50"
                >
                  {i < 2 ? (mul < 1 ? "½" : "2×") : mul < 1 ? "½" : "2×"}
                </button>
              ))}
              <button
                onClick={() => setBetAmount(balance.toFixed(2))}
                disabled={phase !== "idle" && phase !== "crashed" && phase !== "cashed"}
                className="rounded-md bg-card px-2 py-1 text-xs font-semibold hover:bg-muted disabled:opacity-50"
              >
                MAX
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              {t("game.cash_out_at")}
            </Label>
            <Input
              type="number"
              value={autoCashout}
              onChange={(e) => setAutoCashout(e.target.value)}
              min="1.01"
              step="0.01"
            />
          </div>

          <div className="mt-4 flex items-center justify-between">
            <Label htmlFor="autobet" className="text-xs">
              {t("game.auto_bet")}
            </Label>
            <Switch id="autobet" checked={autoBet} onCheckedChange={setAutoBet} />
          </div>

          <div className="mt-4">
            {phase === "flight" ? (
              <Button
                onClick={cashOut}
                size="lg"
                className="w-full bg-gradient-win text-lg font-bold shadow-glow"
              >
                {t("game.cash_out")} @ {formatMultiplier(multiplier)}
              </Button>
            ) : (
              <Button
                onClick={placeBet}
                disabled={busy || phase === "starting"}
                size="lg"
                className="w-full bg-gradient-primary text-lg font-bold shadow-glow disabled:opacity-60"
              >
                {busy || phase === "starting" ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  t("game.place_bet")
                )}
              </Button>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>{t("wallet.balance")}</span>
            <span className="font-mono font-semibold">{formatTrx(balance)} TRX</span>
          </div>
        </div>

        {/* Provably fair info */}
        {round && (
          <div className="rounded-xl border border-border/60 bg-card/40 p-3 text-xs">
            <div className="mb-1 flex items-center gap-1.5 font-semibold text-muted-foreground">
              <RefreshCw className="h-3 w-3" />
              Provably Fair
            </div>
            <div className="break-all font-mono text-[10px] text-muted-foreground">
              {round.serverSeedHash.slice(0, 32)}…
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
