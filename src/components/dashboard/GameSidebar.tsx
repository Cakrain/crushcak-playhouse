import { motion } from "framer-motion";
import { GAMES, GameId } from "@/games/registry";
import { useI18n } from "@/i18n/I18nProvider";
import { cn } from "@/lib/utils";

interface SidebarProps {
  active: GameId;
  onSelect: (g: GameId) => void;
}

export function GameSidebar({ active, onSelect }: SidebarProps) {
  const { t } = useI18n();

  return (
    <aside className="hidden w-60 shrink-0 border-r border-border/60 bg-sidebar/40 lg:block">
      <div className="sticky top-16 flex flex-col gap-1 p-3">
        <h3 className="mb-2 px-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {t("games.title")}
        </h3>
        {GAMES.map((g) => {
          const Icon = g.icon;
          const isActive = active === g.id;
          return (
            <button
              key={g.id}
              onClick={() => g.available && onSelect(g.id)}
              disabled={!g.available}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all",
                isActive && "bg-primary/15 shadow-glow",
                !isActive && g.available && "hover:bg-card",
                !g.available && "cursor-not-allowed opacity-50",
              )}
            >
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br",
                  g.accent,
                  isActive && "ring-2 ring-primary",
                )}
              >
                {Icon ? <Icon className="h-4 w-4" /> : <span className="text-base">{g.emoji}</span>}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={cn("text-sm font-semibold", isActive && "text-primary")}>
                    {t(g.nameKey)}
                  </span>
                  {!g.available && (
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
                      {t("game.coming_soon")}
                    </span>
                  )}
                </div>
                <p className="truncate text-xs text-muted-foreground">{t(g.descKey)}</p>
              </div>
              {isActive && (
                <motion.div
                  layoutId="active-indicator"
                  className="absolute left-0 h-8 w-1 rounded-r-full bg-primary"
                />
              )}
            </button>
          );
        })}
      </div>
    </aside>
  );
}

/** Mobile horizontal scroll picker. */
export function MobileGamePicker({ active, onSelect }: SidebarProps) {
  const { t } = useI18n();
  return (
    <div className="scrollbar-thin flex gap-2 overflow-x-auto border-b border-border/60 bg-sidebar/30 p-2 lg:hidden">
      {GAMES.map((g) => {
        const Icon = g.icon;
        const isActive = active === g.id;
        return (
          <button
            key={g.id}
            onClick={() => g.available && onSelect(g.id)}
            disabled={!g.available}
            className={cn(
              "flex shrink-0 flex-col items-center gap-1 rounded-xl px-3 py-2 transition-all",
              isActive && "bg-primary/15 ring-1 ring-primary",
              !g.available && "opacity-50",
            )}
          >
            <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br", g.accent)}>
              {Icon ? <Icon className="h-4 w-4" /> : <span>{g.emoji}</span>}
            </div>
            <span className="text-[10px] font-semibold">{t(g.nameKey)}</span>
          </button>
        );
      })}
    </div>
  );
}
