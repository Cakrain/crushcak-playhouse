import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Target } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/i18n/I18nProvider";
import { useWallet } from "@/hooks/useProfile";
import { useAuth } from "@/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { playSound } from "@/lib/sounds";
import { formatMultiplier, formatTrx } from "@/lib/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { GameShell } from "./_shared/GameShell";
import { BetControls } from "./_shared/BetControls";

export function LimboCakGame() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { balance, refresh } = useWallet();
  const [betAmount, setBetAmount] = useState("10");
  const [target, setTarget] = useState("2.00");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [won, setWon] = useState<boolean | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  const [animValue, setAnimValue] = useState(1);

  const play = async () => {
    if (!user) return;
    const amt = Number(betAmount);
    const tgt = Number(target);
    if (!Number.isFinite(amt) || amt <= 0) return toast.error(t("common.error"));
    if (amt > balance) return toast.error(t("wallet.insufficient"));
    if (!Number.isFinite(tgt) || tgt < 1.01) return toast.error(t("common.error"));
    setBusy(true);
    setResult(null);
    setWon(null);
    setAnimValue(1);
    playSound("tick");
    const { data, error } = await supabase.functions.invoke("game-play", {
      body: { game: "limbocak", action: "start", bet_amount: amt, target: tgt },
    });
    if (error || !data?.success) {
      setBusy(false);
      toast.error(error?.message ?? data?.error ?? t("common.error"));
      return;
    }
    refresh();
    // Animate ticker up to result
    const target_ = Number(data.result);
    const dur = 1400;
    const t0 = performance.now();
    const tick = () => {
      const p = Math.min(1, (performance.now() - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setAnimValue(1 + (target_ - 1) * eased);
      if (p < 1) requestAnimationFrame(tick);
      else {
        setResult(target_);
        setWon(data.won);
        setBusy(false);
        setHistory((h) => [target_, ...h].slice(0, 12));
        if (data.won) { playSound("win"); toast.success(`+${formatTrx(data.payout)} TRX`); }
        else { playSound("lose"); }
      }
    };
    requestAnimationFrame(tick);
  };

  const winChance = (() => {
    const tgt = Number(target);
    if (!Number.isFinite(tgt) || tgt < 1.01) return 0;
    return Math.max(0, Math.min(100, (96 / tgt))); // ~ (1-edge)/target * 100
  })();

  return (
    <GameShell
      controls={
        <BetControls
          betAmount={betAmount}
          setBetAmount={setBetAmount}
          disabled={busy}
          busy={busy}
          onAction={play}
          actionLabel={t("game.place_bet")}
          extras={
            <div className="mt-4 space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Hedef Çarpan
              </Label>
              <Input type="number" value={target} onChange={(e) => setTarget(e.target.value)} min="1.01" step="0.01" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Kazanma Şansı</span>
                <span className="font-mono">{winChance.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Olası Ödeme</span>
                <span className="font-mono">{formatTrx(Number(betAmount) * Number(target))} TRX</span>
              </div>
            </div>
          }
        />
      }
    >
      <div className="relative flex h-full min-h-[400px] flex-col items-center justify-center p-8">
        <Target className="absolute right-8 top-8 h-8 w-8 text-primary opacity-30" />
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Sonuç</div>
        <AnimatePresence mode="wait">
          <motion.div
            key={busy ? "busy" : result ?? "idle"}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className={cn(
              "mt-2 font-display text-7xl font-bold tabular-nums md:text-9xl",
              won === true ? "text-success drop-shadow-[0_0_30px_hsl(var(--success))]" :
              won === false ? "text-destructive" : "text-primary",
            )}
          >
            {formatMultiplier(busy ? animValue : result ?? 1)}
          </motion.div>
        </AnimatePresence>
        {won != null && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 text-lg font-bold uppercase">
            {won ? "✓ KAZANDIN" : "✗ KAYBETTİN"}
          </motion.div>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-1.5">
          {history.map((h, i) => (
            <span key={i} className={cn(
              "rounded-full px-2 py-0.5 font-mono text-xs",
              h >= Number(target) ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive",
            )}>{h.toFixed(2)}x</span>
          ))}
        </div>
      </div>
    </GameShell>
  );
}
