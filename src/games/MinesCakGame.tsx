import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bomb, Gem, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
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

type TileState = "hidden" | "gem" | "mine";

export function MinesCakGame() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { balance, refresh } = useWallet();
  const [betAmount, setBetAmount] = useState("10");
  const [mineCount, setMineCount] = useState(3);
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [nonce, setNonce] = useState<number | null>(null);
  const [tiles, setTiles] = useState<TileState[]>(Array(25).fill("hidden"));
  const [revealedCount, setRevealedCount] = useState(0);
  const [multiplier, setMultiplier] = useState(1);

  const start = async () => {
    if (!user) return;
    const amt = Number(betAmount);
    if (!Number.isFinite(amt) || amt <= 0) return toast.error(t("common.error"));
    if (amt > balance) return toast.error(t("wallet.insufficient"));
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("game-play", {
      body: { game: "minescak", action: "start", bet_amount: amt, mines: mineCount },
    });
    setBusy(false);
    if (error || !data?.success) {
      toast.error(error?.message ?? data?.error ?? t("common.error"));
      return;
    }
    refresh();
    setNonce(data.nonce);
    setTiles(Array(25).fill("hidden"));
    setRevealedCount(0);
    setMultiplier(1);
    setActive(true);
    playSound("click");
  };

  const reveal = async (tile: number) => {
    if (!active || nonce == null || tiles[tile] !== "hidden" || busy) return;
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("game-play", {
      body: { game: "minescak", action: "reveal", nonce, tile },
    });
    setBusy(false);
    if (error || !data?.success) {
      toast.error(error?.message ?? t("common.error"));
      return;
    }
    if (data.hit_mine) {
      const next = [...tiles];
      (data.mine_positions as number[]).forEach((p) => (next[p] = "mine"));
      setTiles(next);
      setActive(false);
      playSound("explosion");
      playSound("lose");
      toast.error("💥 BOOM!");
    } else {
      const next = [...tiles];
      next[tile] = "gem";
      setTiles(next);
      setRevealedCount(data.revealed.length);
      setMultiplier(data.multiplier);
      playSound("chime", { volume: 0.4 });
    }
  };

  const cashout = async () => {
    if (!active || nonce == null) return;
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("game-play", {
      body: { game: "minescak", action: "cashout", nonce },
    });
    setBusy(false);
    if (error || !data?.success) {
      toast.error(error?.message ?? t("common.error"));
      return;
    }
    setActive(false);
    refresh();
    playSound("cashout");
    playSound("win");
    toast.success(`+${formatTrx(data.payout)} TRX`);
    // reveal mines too
    const next = [...tiles];
    (data.mine_positions as number[]).forEach((p) => (next[p] = next[p] === "hidden" ? "mine" : next[p]));
    setTiles(next);
  };

  return (
    <GameShell
      controls={
        <BetControls
          betAmount={betAmount}
          setBetAmount={setBetAmount}
          disabled={active}
          busy={busy}
          onAction={active ? cashout : start}
          actionLabel={active ? `${t("game.cash_out")} (${formatMultiplier(multiplier)})` : t("game.place_bet")}
          actionVariant={active ? "win" : "primary"}
          extras={
            <div className="mt-4 space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Mayın Sayısı: <span className="text-primary">{mineCount}</span>
              </Label>
              <Slider
                value={[mineCount]}
                onValueChange={(v) => setMineCount(v[0])}
                min={1} max={24} step={1}
                disabled={active}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Açılan: {revealedCount}/{25 - mineCount}</span>
                <span>{formatMultiplier(multiplier)}</span>
              </div>
            </div>
          }
        />
      }
    >
      <div className="flex h-full min-h-[400px] flex-col items-center justify-center p-4 md:p-8">
        <div className="grid grid-cols-5 gap-2 md:gap-3">
          {tiles.map((s, i) => (
            <motion.button
              key={i}
              onClick={() => reveal(i)}
              disabled={!active || s !== "hidden" || busy}
              whileHover={active && s === "hidden" ? { scale: 1.05 } : {}}
              whileTap={active && s === "hidden" ? { scale: 0.95 } : {}}
              className={cn(
                "relative flex h-14 w-14 items-center justify-center rounded-xl border-2 font-bold transition-colors md:h-16 md:w-16",
                s === "hidden" && active && "border-primary/40 bg-card hover:bg-card/70 cursor-pointer",
                s === "hidden" && !active && "border-border bg-card/40",
                s === "gem" && "border-success/50 bg-success/15",
                s === "mine" && "border-destructive/60 bg-destructive/20",
              )}
            >
              <AnimatePresence>
                {s === "gem" && (
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <Gem className="h-7 w-7 text-success drop-shadow-[0_0_8px_hsl(var(--success))]" />
                  </motion.div>
                )}
                {s === "mine" && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                  >
                    <Bomb className="h-7 w-7 text-destructive" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          ))}
        </div>
        {!active && revealedCount === 0 && (
          <p className="mt-6 text-sm text-muted-foreground">{t("game.minescak.desc")}</p>
        )}
      </div>
    </GameShell>
  );
}
