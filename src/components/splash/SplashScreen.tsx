import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Logo } from "@/components/brand/Logo";
import { ParticleField } from "@/components/brand/ParticleField";
import { useTheme, THEMES, ThemeName } from "@/theme/ThemeProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface SplashScreenProps {
  onContinue: () => void;
}

export function SplashScreen({ onContinue }: SplashScreenProps) {
  const { theme, setTheme, hasOnboarded } = useTheme();
  const { t, lang, setLang } = useI18n();
  const [stage, setStage] = useState<"intro" | "themes">("intro");

  useEffect(() => {
    // After intro animation, advance. If onboarded already, skip themes.
    const timer = setTimeout(() => {
      if (hasOnboarded) onContinue();
      else setStage("themes");
    }, 2200);
    return () => clearTimeout(timer);
  }, [hasOnboarded, onContinue]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-background-deep">
      <div className="absolute inset-0 bg-gradient-bg" />
      <ParticleField count={48} />

      <AnimatePresence mode="wait">
        {stage === "intro" ? (
          <motion.div
            key="intro"
            className="relative z-10 flex flex-col items-center gap-6 px-6 text-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <motion.div
              initial={{ rotate: -180, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 100, damping: 15 }}
            >
              <Logo size={120} animated />
            </motion.div>
            <motion.h1
              className="font-display text-5xl font-bold tracking-tight text-gradient-primary md:text-7xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              CrushCak
            </motion.h1>
            <motion.p
              className="text-sm uppercase tracking-[0.3em] text-muted-foreground md:text-base"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.6 }}
            >
              {t("brand.tagline")}
            </motion.p>
          </motion.div>
        ) : (
          <motion.div
            key="themes"
            className="relative z-10 mx-4 flex w-full max-w-md flex-col gap-6 px-2 text-center"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex justify-center">
              <Logo size={64} animated />
            </div>

            {/* Language toggle */}
            <div className="flex justify-center gap-2">
              {(["tr", "en"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={cn(
                    "rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all",
                    lang === l
                      ? "bg-primary text-primary-foreground shadow-glow"
                      : "bg-card text-muted-foreground hover:text-foreground",
                  )}
                >
                  {l}
                </button>
              ))}
            </div>

            <div>
              <h2 className="font-display text-2xl font-bold">{t("splash.welcome")}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{t("splash.choose_theme")}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {THEMES.map((th) => (
                <button
                  key={th.id}
                  onClick={() => setTheme(th.id as ThemeName)}
                  className={cn(
                    "group relative flex flex-col items-center gap-2 overflow-hidden rounded-xl border-2 p-4 transition-all",
                    theme === th.id
                      ? "border-primary shadow-glow"
                      : "border-border hover:border-primary/50",
                  )}
                  style={{ background: th.preview }}
                >
                  <div className="flex w-full items-center justify-between">
                    <div
                      className="h-8 w-8 rounded-full ring-2 ring-white/10"
                      style={{ background: th.accent }}
                    />
                    {theme === th.id && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="rounded-full bg-primary p-1 text-primary-foreground"
                      >
                        <Check className="h-3 w-3" />
                      </motion.div>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-white/90">{t(th.labelKey)}</span>
                </button>
              ))}
            </div>

            <Button size="lg" onClick={onContinue} className="bg-gradient-primary font-semibold shadow-glow">
              {t("splash.continue")}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
