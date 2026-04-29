import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Label } from "@/components/ui/label";
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

type Risk = "low" | "medium" | "high";
const ROWS = 12;

export function PlincoCakGame() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { balance, refresh } = useWallet();
  const [betAmount, setBetAmount] = useState("10");
  const [risk, setRisk] = useState<Risk>("medium");
  const [busy, setBusy] = useState(false);
  const [multipliers, setMultipliers] = useState<number[]>([22, 5, 2, 1.2, 0.9, 0.7, 0.4, 0.7, 0.9, 1.2, 2, 5, 22]);
  const [activeBalls, setActiveBalls] = useState<{ id: number; path: number[]; slot: number; mult: number }[]>([]);
  const [history, setHistory] = useState<{ slot: number; mult: number }[]>([]);
  const ballIdRef = useRef(0);

  const drop = async () => {
    if (!user) return;
    const amt = Number(betAmount);
    if (!Number.isFinite(amt) || amt <= 0) return toast.error(t("common.error"));
    if (amt > balance) return toast.error(t("wallet.insufficient"));
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("game-play", {
      body: { game: "plincocak", action: "start", bet_amount: amt, risk },
    });
    setBusy(false);
    if (error || !data?.success) return toast.error(error?.message ?? t("common.error"));
    refresh();
    setMultipliers(data.multipliers);
    const id = ++ballIdRef.current;
    setActiveBalls((b) => [...b, { id, path: data.path, slot: data.slot, mult: data.multiplier }]);
    playSound("click", { volume: 0.3 });

    // Bounce sounds along the path
    for (let i = 0; i < ROWS; i++) {
      setTimeout(() => playSound("ball_bounce", { volume: 0.2 }), 120 + i * 110);
    }
    setTimeout(() => {
      setActiveBalls((b) => b.filter((x) => x.id !== id));
      setHistory((h) => [{ slot: data.slot, mult: data.multiplier }, ...h].slice(0, 12));
      if (data.multiplier >= 2) playSound("win");
      else if (data.multiplier < 1) playSound("lose");
      if (data.multiplier > 0) toast(`${data.multiplier}x — +${formatTrx(data.payout)} TRX`);
    }, 120 + ROWS * 110 + 200);
  };

  // Geometry
  const W = 100, H = 110;
  const pegRows: { x: number; y: number }[][] = [];
  for (let r = 0; r < ROWS; r++) {
    const cnt = r + 3; // start 3 pegs
    const row: { x: number; y: number }[] = [];
    const spacing = 80 / (cnt - 1);
    const startX = 50 - (spacing * (cnt - 1)) / 2;
    for (let c = 0; c < cnt; c++) row.push({ x: startX + c * spacing, y: 8 + r * 7 });
    pegRows.push(row);
  }
  const slotsCount = ROWS + 1;
  const slotW = 80 / slotsCount;
  const slotStartX = 50 - 40;

  function ballPathPoints(path: number[]) {
    const pts: { x: number; y: number }[] = [{ x: 50, y: 2 }];
    let col = 0;
    for (let r = 0; r < ROWS; r++) {
      col += path[r];
      const cnt = r + 3;
      const spacing = 80 / (cnt - 1);
      const startX = 50 - (spacing * (cnt - 1)) / 2;
      // ball sits between pegs
      const x = startX + (col + (cnt - 1 - r) / 2) * spacing - spacing / 2;
      // simpler: linearly interpolate between peg positions
      const x2 = 50 + (col - r / 2) * (80 / ROWS);
      pts.push({ x: x2, y: 8 + r * 7 + 2 });
    }
    return pts;
  }

  return (
    <GameShell
      controls={
        <BetControls
          betAmount={betAmount}
          setBetAmount={setBetAmount}
          busy={busy}
          onAction={drop}
          actionLabel="Topu Bırak"
          extras={
            <div className="mt-4 space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Risk</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {(["low", "medium", "high"] as Risk[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRisk(r)}
                    className={cn(
                      "rounded-md px-2 py-1.5 text-xs font-semibold uppercase",
                      risk === r ? "bg-gradient-primary text-primary-foreground" : "bg-card hover:bg-muted",
                    )}
                  >{r === "low" ? "Düşük" : r === "medium" ? "Orta" : "Yüksek"}</button>
                ))}
              </div>
            </div>
          }
        />
      }
    >
      <div className="relative h-full min-h-[400px] overflow-hidden bg-gradient-to-b from-purple-950/20 to-background">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full">
          {/* pegs */}
          {pegRows.flat().map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={0.7} fill="hsl(var(--muted-foreground))" opacity={0.6} />
          ))}
          {/* slots */}
          {multipliers.map((m, i) => {
            const x = slotStartX + i * slotW;
            const color = m >= 5 ? "hsl(340 80% 55%)" : m >= 2 ? "hsl(45 90% 55%)" : m >= 1 ? "hsl(160 60% 50%)" : "hsl(220 15% 35%)";
            return (
              <g key={i}>
                <rect x={x + 0.2} y={H - 8} width={slotW - 0.4} height={6} rx={0.8} fill={color} opacity={0.9} />
                <text x={x + slotW / 2} y={H - 3.5} fontSize={2.2} textAnchor="middle" fill="white" fontWeight="bold">
                  {m}x
                </text>
              </g>
            );
          })}
          {/* balls */}
          <AnimatePresence>
            {activeBalls.map((b) => {
              const pts = ballPathPoints(b.path);
              const finalSlotX = slotStartX + b.slot * slotW + slotW / 2;
              const totalDur = 0.11 * ROWS + 0.3;
              const keyframesX = [...pts.map((p) => p.x), finalSlotX];
              const keyframesY = [...pts.map((p) => p.y), H - 5];
              return (
                <motion.circle
                  key={b.id}
                  r={1.5}
                  fill="hsl(var(--primary))"
                  filter="drop-shadow(0 0 2px hsl(var(--primary)))"
                  initial={{ cx: 50, cy: 2 }}
                  animate={{ cx: keyframesX, cy: keyframesY }}
                  transition={{ duration: totalDur, ease: "easeIn", times: keyframesX.map((_, i) => i / (keyframesX.length - 1)) }}
                />
              );
            })}
          </AnimatePresence>
        </svg>
        <div className="absolute bottom-0 left-0 right-0 flex gap-1.5 overflow-x-auto border-t border-border/60 bg-card/60 p-2 backdrop-blur">
          {history.length === 0 ? <span className="px-2 text-xs text-muted-foreground">—</span> :
            history.map((h, i) => (
              <span key={i} className={cn("shrink-0 rounded-full px-2 py-0.5 font-mono text-xs",
                h.mult >= 2 ? "bg-success/15 text-success" : h.mult >= 1 ? "bg-warning/15 text-warning" : "bg-destructive/15 text-destructive",
              )}>{h.mult}x</span>
            ))}
        </div>
      </div>
    </GameShell>
  );
}
