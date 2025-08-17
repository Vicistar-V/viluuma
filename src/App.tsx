import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { UserStatusProvider, useUserStatus } from "@/hooks/useUserStatus";
import { RevenueCatProvider } from "@/hooks/useRevenueCat";
import { useRevenueCatAttributes } from "@/hooks/useRevenueCatAttributes";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProgressForegoneScreen } from "@/pages/ProgressForegoneScreen";
import { UpgradeScreen } from "@/pages/UpgradeScreen";
import { WelcomeTrialModal } from "@/components/monetization/WelcomeTrialModal";
import { PlanUpdateOverlay } from "@/components/ui/plan-update-overlay";
import { useState, useEffect } from "react";
import Index from "./pages/Index";
import LoginScreen from "./pages/LoginScreen";
import SignUpScreen from "./pages/SignUpScreen";
import GoalsScreen from "./pages/GoalsScreen";
import TodayScreen from "./pages/TodayScreen";
import ProfileScreen from "./pages/ProfileScreen";
import CreateManualGoalScreen from "./pages/CreateManualGoalScreen";
import GoalDetailScreen from "./pages/GoalDetailScreen";
import PlanReviewScreen from "./pages/PlanReviewScreen";
import AIOnboardingWizard from "./pages/AIOnboardingWizard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  const { user } = useAuth();
  const { subscriptionStatus, loading: statusLoading, handleDowngrade } = useUserStatus();
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [showDowngradeOverlay, setShowDowngradeOverlay] = useState(false);
  const [prevStatus, setPrevStatus] = useState(subscriptionStatus);

  // Initialize RevenueCat user attributes
  useRevenueCatAttributes();

  // First-time user experience
  useEffect(() => {
    const isFirstLogin = localStorage.getItem('isFirstLogin');
    if (user && subscriptionStatus === 'trial' && isFirstLogin !== 'false') {
      setShowWelcomeModal(true);
      localStorage.setItem('isFirstLogin', 'false');
    }
  }, [user, subscriptionStatus]);

  // Trial-to-free downgrade detection
  useEffect(() => {
    if (prevStatus === 'trial' && subscriptionStatus === 'free') {
      const performDowngrade = async () => {
        setShowDowngradeOverlay(true);
        await handleDowngrade();
        setShowDowngradeOverlay(false);
      };
      performDowngrade();
    }
    setPrevStatus(subscriptionStatus);
  }, [subscriptionStatus, prevStatus, handleDowngrade]);

  return (
    <>
      <Routes>
        <Route path="/" element={<TodayScreen />} />
        <Route path="/welcome" element={<Index />} />
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/signup" element={<SignUpScreen />} />
        <Route path="/goals" element={<GoalsScreen />} />
        <Route path="/goals/new" element={<CreateManualGoalScreen />} />
        <Route path="/goals/ai" element={<AIOnboardingWizard />} />
        <Route path="/plan-review" element={<PlanReviewScreen />} />
        <Route path="/goals/:id" element={<GoalDetailScreen />} />
        <Route path="/profile" element={<ProfileScreen />} />
        <Route path="/progress-foregone/:goalId" element={<ProgressForegoneScreen />} />
        <Route path="/upgrade" element={<UpgradeScreen />} />
        <Route path="*" element={<NotFound />} />
      </Routes>

      <WelcomeTrialModal 
        isOpen={showWelcomeModal}
        onClose={() => setShowWelcomeModal(false)}
      />

      <PlanUpdateOverlay 
        show={showDowngradeOverlay}
        title="Updating your account..."
        description="Organizing your goals and adjusting your plan"
      />
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <RevenueCatProvider>
          <UserStatusProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <AppContent />
              </BrowserRouter>
            </TooltipProvider>
          </UserStatusProvider>
        </RevenueCatProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
