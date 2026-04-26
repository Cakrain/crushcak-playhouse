import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { useTheme } from "@/theme/ThemeProvider";
import { useEffect } from "react";
import { TopNav } from "@/components/dashboard/TopNav";
import { GameSidebar, MobileGamePicker } from "@/components/dashboard/GameSidebar";
import { LiveBetsFeed } from "@/components/dashboard/LiveBetsFeed";
import { CakPlainGame } from "@/games/CakPlainGame";
import { ComingSoonGame } from "@/games/ComingSoonGame";
import { CakBot } from "@/components/cakbot/CakBot";
import { GameId } from "@/games/registry";
import { Loader2 } from "lucide-react";

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const { hasOnboarded } = useTheme();
  const navigate = useNavigate();
  const [activeGame, setActiveGame] = useState<GameId>("cakplain");

  useEffect(() => {
    if (!loading && !user) navigate("/login", { replace: true });
  }, [loading, user, navigate]);

  if (loading || !user || !hasOnboarded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background-deep">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <TopNav />
      <MobileGamePicker active={activeGame} onSelect={setActiveGame} />
      <div className="flex">
        <GameSidebar active={activeGame} onSelect={setActiveGame} />
        <main className="min-h-[calc(100vh-4rem)] flex-1 p-3 md:p-6">
          {activeGame === "cakplain" ? <CakPlainGame /> : <ComingSoonGame gameId={activeGame} />}
        </main>
        <LiveBetsFeed />
      </div>
      <CakBot />
    </div>
  );
}
