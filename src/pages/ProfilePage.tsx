import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/auth/AuthProvider";
import { useProfile, useWallet } from "@/hooks/useProfile";
import { useI18n } from "@/i18n/I18nProvider";
import { supabase } from "@/integrations/supabase/client";
import { TopNav } from "@/components/dashboard/TopNav";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft } from "lucide-react";
import { formatTrx, formatDate, formatMultiplier, shortAddress } from "@/lib/format";
import { GAMES } from "@/games/registry";
import { toast } from "sonner";

interface Tx {
  id: string;
  type: string;
  amount: number;
  status: string;
  destination_address: string | null;
  created_at: string;
}
interface Hist {
  id: string;
  game: string;
  bet_amount: number;
  multiplier: number;
  payout: number;
  won: boolean;
  created_at: string;
}

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const { profile } = useProfile();
  const { balance } = useWallet();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [txs, setTxs] = useState<Tx[]>([]);
  const [hist, setHist] = useState<Hist[]>([]);
  const [pwd, setPwd] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/login", { replace: true });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => setTxs((data ?? []) as Tx[]));
    supabase
      .from("game_history")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => setHist((data ?? []) as Hist[]));
  }, [user]);

  const changePassword = async () => {
    if (pwd.length < 8) {
      toast.error(t("auth.password_too_short"));
      return;
    }
    setPwdLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setPwdLoading(false);
    if (error) toast.error(error.message);
    else {
      toast.success(t("common.success"));
      setPwd("");
    }
  };

  if (loading || !user || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto max-w-4xl p-3 md:p-6">
        <Link to="/" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" />
          {t("nav.dashboard")}
        </Link>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-3xl font-bold">{t("profile.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{profile.email}</p>
        </motion.div>

        <Tabs defaultValue="info" className="mt-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="info">{t("profile.account_info")}</TabsTrigger>
            <TabsTrigger value="tx">{t("profile.transactions")}</TabsTrigger>
            <TabsTrigger value="games">{t("profile.game_history")}</TabsTrigger>
            <TabsTrigger value="prefs">{t("profile.preferences")}</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-3">
            <Card className="p-4">
              <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                <Field label={t("auth.first_name")} value={profile.first_name} />
                <Field label={t("auth.last_name")} value={profile.last_name} />
                <Field label={t("auth.national_id")} value={profile.national_id ?? "—"} />
                <Field label={t("auth.date_of_birth")} value={profile.date_of_birth ?? "—"} />
                <Field label={t("auth.gender")} value={profile.gender ?? "—"} />
                <Field label={t("auth.phone")} value={profile.phone ?? "—"} />
                <Field label={t("auth.country")} value={profile.country ?? "—"} />
                <Field label={t("wallet.balance")} value={`${formatTrx(balance)} TRX`} />
                <div className="md:col-span-2">
                  <Field label={t("wallet.deposit_address")} value={shortAddress(profile.trx_deposit_address, 12, 10)} mono />
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="tx" className="space-y-2">
            {txs.length === 0 ? (
              <Card className="p-6 text-center text-sm text-muted-foreground">{t("profile.no_transactions")}</Card>
            ) : (
              txs.map((tx) => (
                <Card key={tx.id} className="flex items-center justify-between p-3">
                  <div>
                    <div className="font-semibold capitalize">{tx.type}</div>
                    <div className="text-xs text-muted-foreground">{formatDate(tx.created_at)}</div>
                  </div>
                  <div className="text-right">
                    <div className={`font-mono font-bold ${tx.type === "deposit" || tx.type === "win" ? "text-success" : "text-destructive"}`}>
                      {tx.type === "deposit" || tx.type === "win" ? "+" : "−"}
                      {formatTrx(Number(tx.amount))} TRX
                    </div>
                    <div className="text-xs text-muted-foreground">{tx.status}</div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="games" className="space-y-2">
            {hist.length === 0 ? (
              <Card className="p-6 text-center text-sm text-muted-foreground">{t("profile.no_games")}</Card>
            ) : (
              hist.map((g) => {
                const meta = GAMES.find((x) => x.id === g.game);
                return (
                  <Card key={g.id} className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-card">
                        {meta?.icon ? <meta.icon className="h-4 w-4" /> : <span>{meta?.emoji ?? "🎲"}</span>}
                      </div>
                      <div>
                        <div className="font-semibold">{meta ? t(meta.nameKey) : g.game}</div>
                        <div className="text-xs text-muted-foreground">{formatDate(g.created_at)}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-mono font-bold ${g.won ? "text-success" : "text-destructive"}`}>
                        {g.won ? "+" : "−"}
                        {formatTrx(Math.abs(Number(g.payout) - Number(g.bet_amount)))} TRX
                      </div>
                      <div className="text-xs text-muted-foreground">{formatMultiplier(Number(g.multiplier))}</div>
                    </div>
                  </Card>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="prefs" className="space-y-3">
            <Card className="space-y-3 p-4">
              <h3 className="font-semibold">{t("profile.change_password")}</h3>
              <div className="space-y-1.5">
                <Label>{t("auth.password")}</Label>
                <Input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="••••••••" />
              </div>
              <Button onClick={changePassword} disabled={pwdLoading} className="bg-gradient-primary">
                {pwdLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("common.save")}
              </Button>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-0.5 ${mono ? "font-mono text-xs" : "text-sm"} font-semibold`}>{value}</div>
    </div>
  );
}
