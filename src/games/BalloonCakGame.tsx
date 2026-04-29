import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/i18n/I18nProvider";
import { useWallet } from "@/hooks/useProfile";
import { useAuth } from "@/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { playSound, stopAll } from "@/lib/sounds";
import { formatMultiplier, formatTrx } from "@/lib/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { GameShell } from "./_shared/GameShell";
import { BetControls } from "./_shared/BetControls";

type Phase = "idle" | "inflate" | "popped" | "cashed";

export function BalloonCakGame() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { balance, refresh } = useWallet();
  const [betAmount, setBetAmount] = useState("10");
  const [phase, setPhase] = useState<Phase>("idle");
  const [busy, setBusy] = useState(false);
  const [multiplier, setMultiplier] = useState(1);
  const [history, setHistory] = useState<{ pop: number; won: boolean }[]>([]);
  const nonceRef = useRef<number | null>(null);
  const popRef = useRef<number>(0);
  const startTsRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const cashedRef = useRef<number | null>(null);

  const stopLoop = () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); rafRef.current = null; };
  useEffect(() => () => { stopLoop(); stopAll(); }, []);

  const settle = useCallback(async (cashedAt: number | null) => {
    stopLoop();
    cashedRef.current = cashedAt;
    const nonce = nonceRef.current;
    if (nonce == null) return;
    const won = cashedAt != null;
    setPhase(won ? "cashed" : "popped");
    if (won) { playSound("cashout"); playSound("win"); }
    else { playSound("balloon_pop"); playSound("lose"); }
    const { data } = await supabase.functions.invoke("game-play", {
      body: { game: "ballooncak", action: "cashout", nonce, cashed_at: cashedAt ?? 0 },
    });
    if (data?.success) {
      refresh();
      setHistory((h) => [{ pop: data.pop, won }, ...h].slice(0, 15));
    }
  }, [refresh]);

  const tick = useCallback(() => {
    const elapsed = (performance.now() - startTsRef.current) / 1000;
    const m = Math.pow(1.05, elapsed * 4);
    setMultiplier(m);
    if (m >= popRef.current) { void settle(null); return; }
    rafRef.current = requestAnimationFrame(tick);
  }, [settle]);

  const start = async () => {
    if (!user) return;
    const amt = Number(betAmount);
    if (!Number.isFinite(amt) || amt <= 0) return toast.error(t("common.error"));
    if (amt > balance) return toast.error(t("wallet.insufficient"));
    setBusy(true);
    cashedRef.current = null;
    setMultiplier(1);
    const { data, error } = await supabase.functions.invoke("game-play", {
      body: { game: "ballooncak", action: "start", bet_amount: amt },
    });
    setBusy(false);
    if (error || !data?.success) return toast.error(error?.message ?? t("common.error"));
    refresh();
    nonceRef.current = data.nonce;
    const { data: reveal } = await supabase.functions.invoke("game-play", {
      body: { game: "ballooncak", action: "reveal", nonce: data.nonce },
    });
    popRef.current = Number(reveal?.pop ?? 1.5);
    setPhase("inflate");
    playSound("balloon_inflate", { loop: true, volume: 0.3 });
    startTsRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);
  };

  const cashOut = () => {
    if (phase !== "inflate" || cashedRef.current != null) return;
    void settle(multiplier);
  };

  const size = Math.min(280, 80 + (multiplier - 1) * 60);

  return (
    <GameShell
      controls={
        <BetControls
          betAmount={betAmount}
          setBetAmount={setBetAmount}
          disabled={phase === "inflate" || busy}
          busy={busy}
          onAction={phase === "inflate" ? cashOut : start}
          actionLabel={phase === "inflate" ? `${t("game.cash_out")} (${formatMultiplier(multiplier)})` : "ŞİŞİR"}
          actionVariant={phase === "inflate" ? "win" : "primary"}
        />
      }
    >
      <div className="relative flex h-full min-h-[400px] flex-col items-center justify-center overflow-hidden p-8">
        <AnimatePresence mode="wait">
          {phase !== "popped" ? (
            <motion.svg
              key="balloon"
              width={size} height={size * 1.15} viewBox="0 0 100 115"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1, y: phase === "inflate" ? [0, -4, 0] : 0 }}
              exit={{ opacity: 0 }}
              transition={{ y: { duration: 1.5, repeat: Infinity, ease: "easeInOut" } }}
            >
              <defs>
                <radialGradient id="bal" cx="35%" cy="35%">
                  <stop offset="0%" stopColor="hsl(340 90% 75%)" />
                  <stop offset="100%" stopColor="hsl(340 80% 50%)" />
                </radialGradient>
              </defs>
              <ellipse cx="50" cy="45" rx="38" ry="42" fill="url(#bal)" />
              <ellipse cx="40" cy="30" rx="8" ry="14" fill="white" opacity="0.4" />
              <path d="M 50 87 L 47 95 L 53 95 Z" fill="hsl(340 80% 40%)" />
              <path d="M 50 95 Q 48 105, 50 115" stroke="hsl(var(--muted-foreground))" strokeWidth="0.5" fill="none" />
            </motion.svg>
          ) : (
            <motion.div
              key="pop"
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.5, 0] }}
              transition={{ duration: 0.6 }}
              className="font-display text-9xl"
            >💥</motion.div>
          )}
        </AnimatePresence>
        <div className="mt-4 text-center">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Çarpan</div>
          <div className={cn("font-display text-5xl font-bold tabular-nums",
            phase === "popped" ? "text-destructive" : phase === "cashed" ? "text-success" : "text-primary",
          )}>{formatMultiplier(multiplier)}</div>
          {phase === "cashed" && (
            <div className="mt-2 text-success">
              ✓ +{(Number(betAmount) * (cashedRef.current ?? 1) - Number(betAmount)).toFixed(2)} TRX
            </div>
          )}
        </div>
        <div className="absolute bottom-0 left-0 right-0 flex gap-1.5 overflow-x-auto border-t border-border/60 bg-card/60 p-2">
          {history.length === 0 ? <span className="px-2 text-xs text-muted-foreground">—</span> :
            history.map((h, i) => (
              <span key={i} className={cn("shrink-0 rounded-full px-2 py-0.5 font-mono text-xs",
                h.pop >= 2 ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive",
              )}>{h.pop.toFixed(2)}x</span>
            ))}
        </div>
      </div>
    </GameShell>
  );
}
