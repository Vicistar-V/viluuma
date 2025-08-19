import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { useAppLifecycle } from "@/hooks/useAppLifecycle";
import { useMobileNotificationHandlers } from "@/hooks/useMobileNotificationHandlers";
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
import NotificationDashboard from "./pages/NotificationDashboard";
import TaskReminderManagerScreen from "./pages/TaskReminderManagerScreen";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// App Layout component that handles lifecycle
function AppLayout({ children }: { children: React.ReactNode }) {
  useAppLifecycle(); // This handles all mobile app lifecycle and background sync
  useMobileNotificationHandlers(); // This handles notification tap actions
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppLayout>
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
                <Route path="/notifications" element={<NotificationDashboard />} />
                <Route path="/reminders" element={<TaskReminderManagerScreen />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AppLayout>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
