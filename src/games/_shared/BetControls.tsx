import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/i18n/I18nProvider";
import { useWallet } from "@/hooks/useProfile";
import { formatTrx } from "@/lib/format";
import { Loader2 } from "lucide-react";
import { ReactNode } from "react";

interface Props {
  betAmount: string;
  setBetAmount: (v: string) => void;
  disabled?: boolean;
  busy?: boolean;
  onAction: () => void;
  actionLabel: string;
  extras?: ReactNode;
  actionVariant?: "primary" | "win" | "danger";
  showBalance?: boolean;
}
export function BetControls({
  betAmount, setBetAmount, disabled, busy, onAction, actionLabel, extras,
  actionVariant = "primary", showBalance = true,
}: Props) {
  const { t } = useI18n();
  const { balance } = useWallet();
  const variantClass =
    actionVariant === "win" ? "bg-gradient-win" :
    actionVariant === "danger" ? "bg-destructive hover:bg-destructive/90" :
    "bg-gradient-primary";
  return (
    <div className="rounded-2xl border border-border/60 bg-gradient-card p-4 shadow-card">
      <div className="space-y-1.5">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
          {t("game.bet_amount")} (TRX)
        </Label>
        <Input
          type="number"
          value={betAmount}
          onChange={(e) => setBetAmount(e.target.value)}
          disabled={disabled}
          min="0.1" step="0.1"
        />
        <div className="flex gap-1.5">
          <button onClick={() => setBetAmount((Math.max(0.1, Number(betAmount || 0) / 2)).toFixed(2))}
            disabled={disabled}
            className="flex-1 rounded-md bg-card px-2 py-1 text-xs font-semibold hover:bg-muted disabled:opacity-50">½</button>
          <button onClick={() => setBetAmount((Math.max(0.1, Number(betAmount || 0) * 2)).toFixed(2))}
            disabled={disabled}
            className="flex-1 rounded-md bg-card px-2 py-1 text-xs font-semibold hover:bg-muted disabled:opacity-50">2×</button>
          <button onClick={() => setBetAmount(balance.toFixed(2))}
            disabled={disabled}
            className="flex-1 rounded-md bg-card px-2 py-1 text-xs font-semibold hover:bg-muted disabled:opacity-50">MAX</button>
        </div>
      </div>
      {extras}
      <div className="mt-4">
        <Button
          onClick={onAction}
          disabled={busy || disabled}
          size="lg"
          className={`w-full ${variantClass} text-lg font-bold shadow-glow disabled:opacity-60`}
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : actionLabel}
        </Button>
      </div>
      {showBalance && (
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>{t("wallet.balance")}</span>
          <span className="font-mono font-semibold">{formatTrx(balance)} TRX</span>
        </div>
      )}
    </div>
  );
}
