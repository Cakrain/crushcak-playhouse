import { motion } from "framer-motion";
import { useState } from "react";
import { useTheme, THEMES, ThemeName } from "@/theme/ThemeProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/auth/AuthProvider";
import { useWallet, useProfile } from "@/hooks/useProfile";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowDownToLine, ArrowUpFromLine, Globe, LogOut, Palette, User, Wallet } from "lucide-react";
import { formatTrx } from "@/lib/format";
import { Link, useNavigate } from "react-router-dom";
import { DepositDialog } from "@/components/wallet/DepositDialog";
import { WithdrawDialog } from "@/components/wallet/WithdrawDialog";
import { cn } from "@/lib/utils";

export function TopNav() {
  const { theme, setTheme } = useTheme();
  const { t, lang, setLang } = useI18n();
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const { balance } = useWallet();
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const navigate = useNavigate();

  const initials = (profile?.first_name?.[0] ?? user?.email?.[0] ?? "C").toUpperCase();

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="flex h-16 items-center gap-2 px-3 md:gap-4 md:px-6">
          <Link to="/" className="flex items-center gap-2 font-display font-bold">
            <Logo size={32} />
            <span className="hidden text-lg text-gradient-primary sm:inline">CrushCak</span>
          </Link>

          <div className="ml-auto flex items-center gap-2">
            {/* Balance */}
            <div className="hidden items-center gap-2 rounded-full bg-card/80 px-3 py-1.5 sm:flex">
              <Wallet className="h-4 w-4 text-primary" />
              <span className="font-mono text-sm font-semibold tabular-nums">{formatTrx(balance)}</span>
              <span className="text-xs text-muted-foreground">TRX</span>
            </div>

            <Button
              size="sm"
              onClick={() => setDepositOpen(true)}
              className="bg-gradient-primary font-semibold"
            >
              <ArrowDownToLine className="mr-1 h-4 w-4" />
              <span className="hidden md:inline">{t("wallet.deposit")}</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setWithdrawOpen(true)}
              className="border-primary/40 hover:bg-primary/10"
            >
              <ArrowUpFromLine className="mr-1 h-4 w-4" />
              <span className="hidden md:inline">{t("wallet.withdraw")}</span>
            </Button>

            {/* Lang */}
            <button
              onClick={() => setLang(lang === "tr" ? "en" : "tr")}
              className="hidden h-9 items-center gap-1 rounded-md px-2 text-xs font-semibold uppercase text-muted-foreground hover:bg-card hover:text-foreground sm:flex"
              aria-label={t("nav.language")}
            >
              <Globe className="h-4 w-4" />
              {lang}
            </button>

            {/* Theme */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="hidden sm:inline-flex">
                  <Palette className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{t("nav.theme")}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {THEMES.map((th) => (
                  <DropdownMenuItem key={th.id} onClick={() => setTheme(th.id as ThemeName)}>
                    <span
                      className={cn(
                        "mr-2 h-4 w-4 rounded-full ring-2",
                        theme === th.id ? "ring-primary" : "ring-transparent",
                      )}
                      style={{ background: th.preview }}
                    />
                    {t(th.labelKey)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Profile */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-primary font-bold text-primary-foreground">
                  {initials}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate">{profile?.email ?? user?.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  <User className="mr-2 h-4 w-4" />
                  {t("nav.profile")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLang(lang === "tr" ? "en" : "tr")} className="sm:hidden">
                  <Globe className="mr-2 h-4 w-4" />
                  {lang.toUpperCase()}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  {t("auth.logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Mobile balance row */}
        <div className="flex items-center justify-center gap-2 border-t border-border/40 px-3 py-1.5 sm:hidden">
          <Wallet className="h-3.5 w-3.5 text-primary" />
          <span className="font-mono text-xs font-semibold tabular-nums">{formatTrx(balance)} TRX</span>
        </div>
      </header>

      <DepositDialog open={depositOpen} onOpenChange={setDepositOpen} />
      <WithdrawDialog open={withdrawOpen} onOpenChange={setWithdrawOpen} />
    </>
  );
}
