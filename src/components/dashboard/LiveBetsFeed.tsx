import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/i18n/I18nProvider";
import { GAMES } from "@/games/registry";
import { formatTrx, formatMultiplier } from "@/lib/format";
import { TrendingUp, TrendingDown } from "lucide-react";

interface FeedRow {
  id: string;
  game: string;
  bet_amount: number;
  multiplier: number;
  payout: number;
  won: boolean;
  created_at: string;
}

export function LiveBetsFeed() {
  const { t } = useI18n();
  const [rows, setRows] = useState<FeedRow[]>([]);

  useEffect(() => {
    let mounted = true;
    // Anonymized feed via SECURITY DEFINER RPC — no user_id, seeds, or metadata exposed.
    supabase.rpc("get_live_bets_feed").then(({ data }) => {
      if (mounted && data) {
        setRows(
          (data as FeedRow[]).map((r) => ({
            id: r.id,
            game: r.game,
            bet_amount: Number(r.bet_amount),
            multiplier: Number(r.multiplier),
            payout: Number(r.payout),
            won: r.won,
            created_at: r.created_at,
          })),
        );
      }
    });

    // Poll every 5s instead of realtime to avoid leaking user_id via realtime payloads.
    const interval = setInterval(() => {
      supabase.rpc("get_live_bets_feed").then(({ data }) => {
        if (mounted && data) {
          setRows(
            (data as FeedRow[]).map((r) => ({
              id: r.id,
              game: r.game,
              bet_amount: Number(r.bet_amount),
              multiplier: Number(r.multiplier),
              payout: Number(r.payout),
              won: r.won,
              created_at: r.created_at,
            })),
          );
        }
      });
    }, 5000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <aside className="hidden w-72 shrink-0 border-l border-border/60 bg-sidebar/30 xl:block">
      <div className="sticky top-16 p-3">
        <h3 className="mb-3 px-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {t("nav.live_bets")}
        </h3>
        <div className="scrollbar-thin max-h-[calc(100vh-8rem)] space-y-1.5 overflow-y-auto">
          <AnimatePresence initial={false}>
            {rows.map((r) => {
              const meta = GAMES.find((g) => g.id === r.game);
              return (
                <motion.div
                  key={r.id}
                  layout
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="flex items-center gap-2 rounded-lg bg-card/60 p-2 text-xs"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-card">
                    {meta?.icon ? <meta.icon className="h-3.5 w-3.5" /> : <span>{meta?.emoji ?? "🎲"}</span>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{meta ? t(meta.nameKey) : r.game}</div>
                    <div className="text-muted-foreground">{formatTrx(r.bet_amount)} TRX</div>
                  </div>
                  <div className={`flex items-center gap-1 font-mono font-bold ${r.won ? "text-success" : "text-destructive"}`}>
                    {r.won ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {formatMultiplier(r.multiplier)}
                  </div>
                </motion.div>
              );
            })}
            {rows.length === 0 && (
              <div className="rounded-lg bg-card/40 p-4 text-center text-xs text-muted-foreground">
                —
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </aside>
  );
}
