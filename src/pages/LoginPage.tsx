import { useState, FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/i18n/I18nProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/brand/Logo";
import { ParticleField } from "@/components/brand/ParticleField";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const schema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(6).max(128),
});

export default function LoginPage() {
  const { t, lang, setLang } = useI18n();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? t("common.error"));
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    navigate("/", { replace: true });
  };

  const onForgot = async () => {
    if (!email) {
      toast.error(t("auth.email"));
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success(t("auth.reset_email_sent"));
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background-deep p-4">
      <div className="absolute inset-0 bg-gradient-bg" />
      <ParticleField count={24} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="mb-6 flex justify-end">
          <div className="flex gap-1 rounded-full bg-card/60 p-1 text-xs">
            {(["tr", "en"] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`rounded-full px-3 py-1 font-semibold uppercase ${
                  lang === l ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className="glass rounded-2xl p-6 shadow-elevated md:p-8">
          <div className="mb-6 flex flex-col items-center gap-3">
            <Logo size={56} />
            <h1 className="font-display text-2xl font-bold">{t("auth.welcome_back")}</h1>
            <p className="text-sm text-muted-foreground">{t("brand.tagline")}</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">{t("auth.email")}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">{t("auth.password")}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-primary font-semibold shadow-glow"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("auth.signing_in")}
                </>
              ) : (
                t("auth.login")
              )}
            </Button>
          </form>

          <div className="mt-4 flex items-center justify-between text-sm">
            <button onClick={onForgot} className="text-muted-foreground hover:text-primary">
              {t("auth.forgot_password")}
            </button>
            <Link to="/register" className="font-semibold text-primary hover:underline">
              {t("auth.register")}
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
