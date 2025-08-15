import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { UserStatusProvider } from "@/hooks/useUserStatus";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProgressForegoneScreen } from "@/pages/ProgressForegoneScreen";
import { UpgradeScreen } from "@/pages/UpgradeScreen";
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

const App = () => (
  <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <UserStatusProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
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
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
          </UserStatusProvider>
        </AuthProvider>
      </ThemeProvider>
  </QueryClientProvider>
);

export default App;
