import { useState, FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/i18n/I18nProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Logo } from "@/components/brand/Logo";
import { ParticleField } from "@/components/brand/ParticleField";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const COUNTRIES = ["TR", "DE", "GB", "US", "FR", "NL", "AZ", "RU", "Other"];

const schema = z
  .object({
    email: z.string().trim().email().max(255),
    firstName: z.string().trim().min(1).max(50),
    lastName: z.string().trim().min(1).max(50),
    nationalId: z.string().regex(/^\d{11}$/, "auth.invalid_tc"),
    dateOfBirth: z.string().refine((d) => {
      const dob = new Date(d);
      const min = new Date();
      min.setFullYear(min.getFullYear() - 18);
      return dob <= min;
    }, "auth.must_be_18"),
    gender: z.enum(["male", "female", "other"]),
    phone: z.string().min(5).max(30),
    country: z.string().min(2),
    password: z.string().min(8, "auth.password_too_short").max(128),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { message: "auth.passwords_dont_match", path: ["confirm"] });

export default function RegisterPage() {
  const { t, lang, setLang } = useI18n();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    nationalId: "",
    dateOfBirth: "",
    gender: "male" as "male" | "female" | "other",
    phone: "",
    country: "TR",
    password: "",
    confirm: "",
  });

  const update = <K extends keyof typeof form>(key: K, val: (typeof form)[K]) =>
    setForm((s) => ({ ...s, [key]: val }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? t("common.error");
      toast.error(t(msg));
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          first_name: parsed.data.firstName,
          last_name: parsed.data.lastName,
          national_id: parsed.data.nationalId,
          date_of_birth: parsed.data.dateOfBirth,
          gender: parsed.data.gender,
          phone: parsed.data.phone,
          country: parsed.data.country,
        },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("auth.success_signup"));
    navigate("/", { replace: true });
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background-deep">
      <div className="absolute inset-0 bg-gradient-bg" />
      <ParticleField count={20} />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-2xl items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full"
        >
          <div className="mb-4 flex justify-end">
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
            <div className="mb-6 flex flex-col items-center gap-2">
              <Logo size={48} />
              <h1 className="font-display text-2xl font-bold">{t("auth.create_account")}</h1>
            </div>

            <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{t("auth.first_name")}</Label>
                <Input value={form.firstName} onChange={(e) => update("firstName", e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label>{t("auth.last_name")}</Label>
                <Input value={form.lastName} onChange={(e) => update("lastName", e.target.value)} required />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label>{t("auth.email")}</Label>
                <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} required />
              </div>

              <div className="space-y-1.5">
                <Label>{t("auth.national_id")}</Label>
                <Input
                  inputMode="numeric"
                  maxLength={11}
                  value={form.nationalId}
                  onChange={(e) => update("nationalId", e.target.value.replace(/\D/g, ""))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("auth.date_of_birth")}</Label>
                <Input
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => update("dateOfBirth", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>{t("auth.gender")}</Label>
                <Select value={form.gender} onValueChange={(v) => update("gender", v as typeof form.gender)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">{t("auth.gender.male")}</SelectItem>
                    <SelectItem value="female">{t("auth.gender.female")}</SelectItem>
                    <SelectItem value="other">{t("auth.gender.other")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("auth.phone")}</Label>
                <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} required />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label>{t("auth.country")}</Label>
                <Select value={form.country} onValueChange={(v) => update("country", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>{t("auth.password")}</Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => update("password", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("auth.password_confirm")}</Label>
                <Input
                  type="password"
                  value={form.confirm}
                  onChange={(e) => update("confirm", e.target.value)}
                  required
                />
              </div>

              <div className="md:col-span-2">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-primary font-semibold shadow-glow"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("auth.signing_up")}
                    </>
                  ) : (
                    t("auth.register")
                  )}
                </Button>
              </div>
            </form>

            <div className="mt-4 text-center text-sm">
              <span className="text-muted-foreground">{t("auth.have_account")} </span>
              <Link to="/login" className="font-semibold text-primary hover:underline">
                {t("auth.login")}
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
