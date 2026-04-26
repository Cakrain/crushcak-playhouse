import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/I18nProvider";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { shortAddress } from "@/lib/format";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

interface Rates {
  usd: number;
  try: number;
}

export function DepositDialog({ open, onOpenChange }: Props) {
  const { t } = useI18n();
  const { profile } = useProfile();
  const { user } = useAuth();
  const [rates, setRates] = useState<Rates | null>(null);
  const [simAmount, setSimAmount] = useState("100");
  const [simLoading, setSimLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch("https://api.coingecko.com/api/v3/simple/price?ids=tron&vs_currencies=usd,try")
      .then((r) => r.json())
      .then((d) => setRates({ usd: d?.tron?.usd ?? 0, try: d?.tron?.try ?? 0 }))
      .catch(() => setRates({ usd: 0.13, try: 4.5 })); // fallback
  }, [open]);

  const address = profile?.trx_deposit_address ?? "";

  const copy = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      toast.success(t("wallet.address_copied"));
    } catch {
      toast.error(t("common.error"));
    }
  };

  const simulateDeposit = async () => {
    if (!user) return;
    const amt = Number(simAmount);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error(t("common.error"));
      return;
    }
    setSimLoading(true);
    const { data, error } = await supabase.functions.invoke("wallet-action", {
      body: { action: "simulate_deposit", amount: amt },
    });
    setSimLoading(false);
    if (error || !data?.success) {
      toast.error(error?.message ?? data?.error ?? t("common.error"));
      return;
    }
    toast.success(t("wallet.deposit_success"));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <Sparkles className="h-5 w-5 text-primary" />
            {t("wallet.deposit")}
          </DialogTitle>
          <DialogDescription>{t("wallet.deposit_address")}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          <div className="rounded-2xl bg-white p-4 shadow-glow">
            {address && <QRCodeSVG value={address} size={180} bgColor="#fff" fgColor="#000" level="M" />}
          </div>

          <button
            onClick={copy}
            className="flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-card/60 p-3 font-mono text-xs hover:bg-card"
          >
            <span className="truncate">{address ? shortAddress(address, 10, 8) : "—"}</span>
            <Copy className="h-4 w-4 shrink-0" />
          </button>

          {rates && (
            <div className="flex w-full justify-between rounded-lg bg-card/40 p-2 text-xs text-muted-foreground">
              <span>{t("wallet.live_rates")}:</span>
              <span className="font-mono">
                1 TRX ≈ ${rates.usd.toFixed(4)} / ₺{rates.try.toFixed(2)}
              </span>
            </div>
          )}

          <div className="w-full rounded-xl border border-warning/30 bg-warning/5 p-3 text-xs text-muted-foreground">
            <strong className="text-warning">Demo:</strong>{" "}
            <span>
              Bu sürümde TRX gönderimleri simüle edilir. Aşağıdan test bakiyesi ekleyebilirsin.
            </span>
          </div>

          <div className="w-full space-y-2">
            <Label className="text-xs">{t("wallet.simulate_deposit")}</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                value={simAmount}
                onChange={(e) => setSimAmount(e.target.value)}
                min="1"
                step="0.01"
              />
              <Button onClick={simulateDeposit} disabled={simLoading} className="bg-gradient-primary">
                {simLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "+"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
