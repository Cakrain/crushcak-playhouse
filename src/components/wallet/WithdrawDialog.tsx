import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/i18n/I18nProvider";
import { useWallet } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowUpFromLine, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const MIN = 10;

export function WithdrawDialog({ open, onOpenChange }: Props) {
  const { t } = useI18n();
  const { balance, refresh } = useWallet();
  const [address, setAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [rates, setRates] = useState<{ usd: number; try: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setAddress("");
    setAmount("");
    fetch("https://api.coingecko.com/api/v3/simple/price?ids=tron&vs_currencies=usd,try")
      .then((r) => r.json())
      .then((d) => setRates({ usd: d?.tron?.usd ?? 0, try: d?.tron?.try ?? 0 }))
      .catch(() => setRates({ usd: 0.13, try: 4.5 }));
  }, [open]);

  const amt = Number(amount);
  const tooLow = amt > 0 && amt < MIN;
  const tooMuch = amt > balance;
  const validAddr = /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address);

  const next = () => {
    if (!validAddr) {
      toast.error(t("wallet.dest_address"));
      return;
    }
    if (!Number.isFinite(amt) || tooLow) {
      toast.error(t("wallet.min_withdraw"));
      return;
    }
    if (tooMuch) {
      toast.error(t("wallet.insufficient"));
      return;
    }
    setStep(2);
  };

  const submit = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("wallet-action", {
      body: { action: "withdraw", amount: amt, destination_address: address },
    });
    setLoading(false);
    if (error || !data?.success) {
      toast.error(error?.message ?? data?.error ?? t("common.error"));
      return;
    }
    toast.success(t("wallet.withdraw_success"));
    refresh();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <ArrowUpFromLine className="h-5 w-5 text-primary" />
            {t("wallet.withdraw")}
          </DialogTitle>
          <DialogDescription>{t("wallet.min_withdraw")}</DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t("wallet.dest_address")}</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="T..." />
            </div>
            <div className="space-y-1.5">
              <Label>
                {t("wallet.amount")} (TRX)
              </Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min={MIN}
                step="0.01"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{t("wallet.balance")}: {balance.toFixed(2)} TRX</span>
                {rates && amt > 0 && (
                  <span className="font-mono">
                    ≈ ${(amt * rates.usd).toFixed(2)} / ₺{(amt * rates.try).toFixed(2)}
                  </span>
                )}
              </div>
            </div>
            <Button onClick={next} className="w-full bg-gradient-primary font-semibold">
              {t("common.next")}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-warning/40 bg-warning/5 p-4">
              <div className="mb-2 flex items-center gap-2 font-semibold text-warning">
                <AlertTriangle className="h-4 w-4" />
                {t("wallet.confirm_withdraw")}
              </div>
              <div className="space-y-1 font-mono text-xs">
                <div className="text-muted-foreground">→ {address}</div>
                <div className="text-base font-bold text-foreground">{amt.toFixed(4)} TRX</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => setStep(1)} disabled={loading}>
                {t("common.back")}
              </Button>
              <Button onClick={submit} disabled={loading} className="bg-gradient-primary font-semibold">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("common.confirm")}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
