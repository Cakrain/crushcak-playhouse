import { useState } from "react";
import { useAuth } from "@/auth/AuthProvider";
import { useTheme } from "@/theme/ThemeProvider";
import { SplashScreen } from "@/components/splash/SplashScreen";
import DashboardPage from "./DashboardPage";
import LoginPage from "./LoginPage";
import { Loader2 } from "lucide-react";

const Index = () => {
  const { user, loading } = useAuth();
  const { hasOnboarded, completeOnboarding } = useTheme();
  const [splashDone, setSplashDone] = useState(hasOnboarded);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background-deep">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!splashDone) {
    return (
      <SplashScreen
        onContinue={() => {
          if (!hasOnboarded) completeOnboarding();
          setSplashDone(true);
        }}
      />
    );
  }

  return user ? <DashboardPage /> : <LoginPage />;
};

export default Index;
