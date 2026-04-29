import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/I18nProvider";
import { useWallet } from "@/hooks/useProfile";
import { useAuth } from "@/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { playSound } from "@/lib/sounds";
import { formatTrx } from "@/lib/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { GameShell } from "./_shared/GameShell";
import { BetControls } from "./_shared/BetControls";

interface Card { r: number; s: number }
const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

function CardView({ card, hidden, idx }: { card?: Card; hidden?: boolean; idx: number }) {
  return (
    <motion.div
      initial={{ rotateY: 180, x: -40, opacity: 0 }}
      animate={{ rotateY: hidden ? 180 : 0, x: 0, opacity: 1 }}
      transition={{ duration: 0.4, delay: idx * 0.12 }}
      style={{ transformStyle: "preserve-3d" }}
      className={cn(
        "relative flex h-24 w-16 items-center justify-center rounded-lg border-2 font-bold shadow-lg md:h-32 md:w-20",
        hidden ? "border-primary/50 bg-gradient-to-br from-indigo-900 to-indigo-700" : "border-border bg-white text-black",
      )}
    >
      {!hidden && card && (
        <div className={cn("flex flex-col items-center", card.s === 1 || card.s === 2 ? "text-red-600" : "text-black")}>
          <div className="text-2xl md:text-3xl">{RANKS[card.r - 1]}</div>
          <div className="text-xl md:text-2xl">{SUITS[card.s]}</div>
        </div>
      )}
      {hidden && <div className="font-display text-3xl text-primary">♠</div>}
    </motion.div>
  );
}

function total(hand: Card[]): number {
  let t = 0, aces = 0;
  for (const c of hand) {
    if (c.r === 1) { t += 11; aces++; }
    else if (c.r >= 10) t += 10;
    else t += c.r;
  }
  while (t > 21 && aces > 0) { t -= 10; aces--; }
  return t;
}

export function BlackCakGame() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { balance, refresh } = useWallet();
  const [betAmount, setBetAmount] = useState("10");
  const [busy, setBusy] = useState(false);
  const [nonce, setNonce] = useState<number | null>(null);
  const [player, setPlayer] = useState<Card[]>([]);
  const [dealer, setDealer] = useState<Card[]>([]);
  const [dealerHidden, setDealerHidden] = useState(true);
  const [phase, setPhase] = useState<"idle" | "playing" | "done">("idle");
  const [outcome, setOutcome] = useState<string | null>(null);
  const [doubled, setDoubled] = useState(false);

  const start = async () => {
    if (!user) return;
    const amt = Number(betAmount);
    if (!Number.isFinite(amt) || amt <= 0) return toast.error(t("common.error"));
    if (amt > balance) return toast.error(t("wallet.insufficient"));
    setBusy(true);
    setOutcome(null);
    setDoubled(false);
    const { data, error } = await supabase.functions.invoke("game-play", {
      body: { game: "blackcak", action: "start", bet_amount: amt },
    });
    setBusy(false);
    if (error || !data?.success) return toast.error(error?.message ?? t("common.error"));
    refresh();
    setNonce(data.nonce);
    setPlayer(data.player);
    if (data.finished) {
      // Natural blackjack
      setDealer(data.dealer);
      setDealerHidden(false);
      setPhase("done");
      setOutcome(data.outcome);
      playSound("card_flip");
      if (data.outcome === "blackjack") { playSound("win"); toast.success(`Blackjack! +${formatTrx(data.payout)} TRX`); }
      else if (data.outcome === "push") toast("Push");
      return;
    }
    setDealer([data.dealer_up, { r: 0, s: 0 }]);
    setDealerHidden(true);
    setPhase("playing");
    playSound("card_flip");
  };

  const action = async (a: "hit" | "stand" | "double") => {
    if (nonce == null) return;
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("game-play", {
      body: { game: "blackcak", action: a, nonce },
    });
    setBusy(false);
    if (error || !data?.success) return toast.error(error?.message ?? t("common.error"));
    playSound("card_flip");
    if (a === "double") setDoubled(true);
    if (data.finished) {
      setPlayer(data.player);
      setDealer(data.dealer);
      setDealerHidden(false);
      setPhase("done");
      setOutcome(data.outcome);
      refresh();
      if (data.outcome === "win") { playSound("win"); toast.success(`Kazandın! +${formatTrx(data.payout)} TRX`); }
      else if (data.outcome === "push") { toast("Berabere"); }
      else { playSound("lose"); }
    } else {
      setPlayer(data.player);
    }
  };

  const pT = total(player);
  const dT = dealerHidden ? total([dealer[0]]) : total(dealer);

  return (
    <GameShell
      controls={
        phase === "playing" ? (
          <div className="rounded-2xl border border-border/60 bg-gradient-card p-4 shadow-card">
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => action("hit")} disabled={busy} className="bg-primary">Hit</Button>
              <Button onClick={() => action("stand")} disabled={busy} className="bg-secondary">Stand</Button>
              <Button onClick={() => action("double")} disabled={busy || player.length !== 2 || Number(betAmount) > balance} className="col-span-2 bg-warning">Double</Button>
            </div>
            <div className="mt-3 text-center text-sm text-muted-foreground">
              Senin: <span className="font-bold text-foreground">{pT}</span> · Krupiye: <span className="font-bold text-foreground">{dT}</span>
            </div>
          </div>
        ) : (
          <BetControls
            betAmount={betAmount}
            setBetAmount={setBetAmount}
            busy={busy}
            onAction={start}
            actionLabel={phase === "done" ? "Yeniden Oyna" : "Dağıt"}
          />
        )
      }
    >
      <div className="flex h-full min-h-[400px] flex-col items-center justify-between p-6 md:p-10 bg-gradient-to-b from-emerald-950/20 to-background">
        <div className="flex flex-col items-center gap-2">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Krupiye {!dealerHidden && `· ${total(dealer)}`}</div>
          <div className="flex gap-2">
            {dealer.map((c, i) => (
              <CardView key={i} card={c} hidden={dealerHidden && i === 1} idx={i} />
            ))}
            {dealer.length === 0 && <div className="h-24 w-16 rounded-lg border-2 border-dashed border-border/40" />}
          </div>
        </div>

        <AnimatePresence>
          {outcome && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className={cn(
                "rounded-full px-6 py-2 font-display text-2xl font-bold uppercase",
                outcome === "win" || outcome === "blackjack" ? "bg-success/20 text-success" :
                outcome === "push" ? "bg-warning/20 text-warning" :
                "bg-destructive/20 text-destructive",
              )}
            >
              {outcome === "win" && "✓ Kazandın"}
              {outcome === "blackjack" && "★ Blackjack"}
              {outcome === "push" && "= Berabere"}
              {outcome === "lose" && "✗ Kaybettin"}
              {outcome === "bust" && "✗ Bust"}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-col items-center gap-2">
          <div className="flex gap-2">
            {player.map((c, i) => (
              <CardView key={i} card={c} idx={i} />
            ))}
            {player.length === 0 && <div className="h-24 w-16 rounded-lg border-2 border-dashed border-border/40" />}
          </div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Sen {player.length > 0 && `· ${pT}`} {doubled && "(2x)"}</div>
        </div>
      </div>
    </GameShell>
  );
}
