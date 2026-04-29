import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Rocket } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { useWallet } from "@/hooks/useProfile";
import { useAuth } from "@/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { playSound, stopAll } from "@/lib/sounds";
import { formatMultiplier, formatTrx } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { GameShell } from "./_shared/GameShell";
import { BetControls } from "./_shared/BetControls";

type Phase = "idle" | "flight" | "crashed" | "cashed";

export function RokketCakGame() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { balance, refresh } = useWallet();
  const [betAmount, setBetAmount] = useState("10");
  const [phase, setPhase] = useState<Phase>("idle");
  const [busy, setBusy] = useState(false);
  const [multiplier, setMultiplier] = useState(1);
  const [history, setHistory] = useState<{ crash: number; won: boolean }[]>([]);
  const nonceRef = useRef<number | null>(null);
  const crashRef = useRef<number>(0);
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
    setPhase(won ? "cashed" : "crashed");
    if (won) { playSound("cashout"); playSound("win"); } else { playSound("explosion"); playSound("lose"); }
    const { data } = await supabase.functions.invoke("game-play", {
      body: { game: "rokketcak", action: "cashout", nonce, cashed_at: cashedAt ?? 0 },
    });
    if (data?.success) {
      refresh();
      setHistory((h) => [{ crash: data.crash, won }, ...h].slice(0, 15));
    }
  }, [refresh]);

  const tick = useCallback(() => {
    const elapsed = (performance.now() - startTsRef.current) / 1000;
    const m = Math.pow(1.06, elapsed * 4);
    setMultiplier(m);
    if (m >= crashRef.current) {
      void settle(null);
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [settle]);

  const launch = async () => {
    if (!user) return;
    const amt = Number(betAmount);
    if (!Number.isFinite(amt) || amt <= 0) return toast.error(t("common.error"));
    if (amt > balance) return toast.error(t("wallet.insufficient"));
    setBusy(true);
    cashedRef.current = null;
    setMultiplier(1);
    const { data, error } = await supabase.functions.invoke("game-play", {
      body: { game: "rokketcak", action: "start", bet_amount: amt },
    });
    setBusy(false);
    if (error || !data?.success) return toast.error(error?.message ?? t("common.error"));
    refresh();
    nonceRef.current = data.nonce;
    // Need crash for client-side animation. Fetch it via reveal.
    const { data: reveal } = await supabase.functions.invoke("game-play", {
      body: { game: "rokketcak", action: "reveal", nonce: data.nonce },
    });
    crashRef.current = Number(reveal?.crash ?? 1.5);
    setPhase("flight");
    playSound("hum", { loop: true, volume: 0.25 });
    startTsRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);
  };

  const cashOut = () => {
    if (phase !== "flight" || cashedRef.current != null) return;
    void settle(multiplier);
  };

  // visual position
  const t01 = Math.min(1, Math.log(multiplier) / Math.log(10));
  const x = 5 + t01 * 70;
  const y = 5 + t01 * 70;

  return (
    <GameShell
      controls={
        <BetControls
          betAmount={betAmount}
          setBetAmount={setBetAmount}
          disabled={phase === "flight" || busy}
          busy={busy}
          onAction={phase === "flight" ? cashOut : launch}
          actionLabel={
            phase === "flight" ? `${t("game.cash_out")} (${formatMultiplier(multiplier)})` : "🚀 FIRLAT"
          }
          actionVariant={phase === "flight" ? "win" : "primary"}
        />
      }
    >
      <div className="relative h-full min-h-[400px] overflow-hidden">
        {/* star field */}
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/40 via-background to-background" />
        {Array.from({ length: 40 }).map((_, i) => (
          <div
            key={i}
            className="absolute h-0.5 w-0.5 animate-pulse rounded-full bg-white"
            style={{
              top: `${(i * 37) % 100}%`,
              left: `${(i * 53) % 100}%`,
              animationDelay: `${(i % 5) * 0.2}s`,
              opacity: 0.3 + (i % 5) * 0.15,
            }}
          />
        ))}
        {/* trail */}
        {phase === "flight" && (
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <linearGradient id="rkt-trail" x1="0" y1="100%" x2="100%" y2="0">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="1" />
              </linearGradient>
            </defs>
            <path d={`M 5 95 Q ${x / 2} ${95 - y / 2}, ${x} ${100 - y}`}
              fill="none" stroke="url(#rkt-trail)" strokeWidth="0.8" />
          </svg>
        )}
        {/* rocket */}
        <motion.div
          className="absolute"
          style={{ left: `${x}%`, bottom: `${y}%` }}
          animate={phase === "crashed" ? { y: 200, rotate: 90, opacity: 0 } : { rotate: -25 }}
          transition={{ duration: phase === "crashed" ? 0.7 : 0.2 }}
        >
          <Rocket className={cn(
            "h-12 w-12 md:h-16 md:w-16",
            phase === "crashed" ? "text-destructive" : phase === "cashed" ? "text-success" : "text-primary",
          )} />
        </motion.div>
        {/* multiplier */}
        <div className="relative flex h-full flex-col items-center justify-center p-8">
          <AnimatePresence mode="wait">
            {phase === "idle" && (
              <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-muted-foreground">
                <Rocket className="mx-auto mb-3 h-10 w-10 opacity-50" />
                <div className="text-sm">Roketi fırlat ve doğru anda nakde çevir!</div>
              </motion.div>
            )}
            {phase !== "idle" && (
              <motion.div key="m" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                <div className="text-xs uppercase tracking-widest text-muted-foreground">Çarpan</div>
                <div className={cn("font-display text-7xl font-bold tabular-nums md:text-9xl",
                  phase === "crashed" ? "text-destructive" : phase === "cashed" ? "text-success" : "text-primary",
                )}>{formatMultiplier(multiplier)}</div>
                {phase === "crashed" && <div className="mt-2 text-xl font-bold text-destructive">💥 PATLADI</div>}
                {phase === "cashed" && (
                  <div className="mt-2 text-xl font-bold text-success">
                    ✓ +{(Number(betAmount) * (cashedRef.current ?? 1) - Number(betAmount)).toFixed(2)} TRX
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="absolute bottom-0 left-0 right-0 flex gap-1.5 overflow-x-auto border-t border-border/60 bg-card/60 p-2 backdrop-blur">
          {history.length === 0 ? <span className="px-2 text-xs text-muted-foreground">—</span> :
            history.map((h, i) => (
              <span key={i} className={cn("shrink-0 rounded-full px-2 py-0.5 font-mono text-xs",
                h.crash >= 2 ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive",
              )}>{h.crash.toFixed(2)}x</span>
            ))}
        </div>
      </div>
    </GameShell>
  );
}
