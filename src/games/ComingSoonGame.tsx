import { motion } from "framer-motion";
import { GAMES, GameId } from "@/games/registry";
import { useI18n } from "@/i18n/I18nProvider";
import { Construction } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  gameId: GameId;
}

export function ComingSoonGame({ gameId }: Props) {
  const { t } = useI18n();
  const meta = GAMES.find((g) => g.id === gameId)!;
  const Icon = meta.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex h-full min-h-[400px] items-center justify-center rounded-2xl border border-border/60 bg-gradient-card shadow-card"
    >
      <div className="text-center">
        <div
          className={cn(
            "mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br",
            meta.accent,
          )}
        >
          {Icon ? <Icon className="h-10 w-10" /> : <span className="text-4xl">{meta.emoji}</span>}
        </div>
        <h2 className="font-display text-3xl font-bold">{t(meta.nameKey)}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t(meta.descKey)}</p>
        <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-warning/10 px-4 py-2 text-sm font-semibold text-warning">
          <Construction className="h-4 w-4" />
          {t("game.coming_soon")}
        </div>
      </div>
    </motion.div>
  );
}
