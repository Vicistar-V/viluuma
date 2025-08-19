import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Crown, 
  Zap, 
  Target, 
  Calendar, 
  CheckCircle2, 
  ArrowLeft,
  Sparkles,
  Users,
  Smartphone
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSubscription, useRevenueCat } from "@/hooks/useSubscription";
import { PaywallModal } from "@/components/paywall/PaywallModal";
import { SubscriptionStatusIndicator } from "@/components/subscription/SubscriptionStatusIndicator";
import { BottomNav } from "@/components/BottomNav";
import { useState } from "react";

const SubscriptionManagerScreen = () => {
  const navigate = useNavigate();
  const subscription = useSubscription();
  const { restorePurchases, isLoading } = useRevenueCat();
  const [showPaywall, setShowPaywall] = useState(false);

  const features = [
    {
      name: "Goal Creation",
      free: "2 goals max",
      pro: "Unlimited goals",
      icon: Target,
      highlight: true
    },
    {
      name: "AI Planner",
      free: "Basic suggestions",
      pro: "Advanced AI planning",
      icon: Sparkles,
      highlight: true
    },
    {
      name: "Archive & Organization",
      free: "Manual archive only",
      pro: "Smart archiving system",
      icon: CheckCircle2,
      highlight: false
    },
    {
      name: "Mobile Sync",
      free: "Basic sync",
      pro: "Real-time sync",
      icon: Smartphone,
      highlight: false
    },
    {
      name: "Priority Support",
      free: "Community support",
      pro: "Email support",
      icon: Users,
      highlight: false
    }
  ];

  const handleRestorePurchases = async () => {
    try {
      await restorePurchases.mutateAsync();
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  if (subscription.isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" onClick={() => navigate('/profile')}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-xl font-semibold">Subscription</h1>
            </div>
          </div>
        </header>
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-24 bg-muted rounded-lg"></div>
            <div className="h-96 bg-muted rounded-lg"></div>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/profile')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-xl font-semibold">Subscription</h1>
          </div>
          <SubscriptionStatusIndicator variant="header" />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 pb-24 space-y-6">
        {/* Current Plan Status */}
        <Card className={subscription.entitlement === 'pro' ? 'border-primary/20 bg-primary/5' : ''}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {subscription.entitlement === 'pro' ? (
                    <>
                      <Crown className="h-5 w-5 text-primary" />
                      Pro Plan
                    </>
                  ) : (
                    <>
                      <Zap className="h-5 w-5 text-muted-foreground" />
                      Free Plan
                    </>
                  )}
                </CardTitle>
                <CardDescription>
                  {subscription.entitlement === 'pro' ? 
                    'You have access to all premium features' :
                    `Using ${subscription.activeGoalCount} of ${subscription.maxGoals} goals`
                  }
                </CardDescription>
              </div>
              <SubscriptionStatusIndicator />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Goals Created</p>
                <p className="text-2xl font-bold">{subscription.activeGoalCount}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Plan Limit</p>
                <p className="text-2xl font-bold">
                  {subscription.entitlement === 'pro' ? '∞' : subscription.maxGoals}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Feature Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Features Comparison</CardTitle>
            <CardDescription>
              See what's included in each plan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {features.map((feature, index) => (
                <div 
                  key={index}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    feature.highlight ? 'bg-primary/5 border-primary/20' : 'bg-muted/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <feature.icon className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">{feature.name}</span>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground mb-1">Free</div>
                      <div className="text-sm">{feature.free}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground mb-1">Pro</div>
                      <div className="text-sm font-semibold text-primary">{feature.pro}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-3">
          {subscription.entitlement === 'free' ? (
            <Button 
              onClick={() => setShowPaywall(true)}
              className="w-full"
              size="lg"
            >
              <Crown className="w-4 h-4 mr-2" />
              Upgrade to Pro
            </Button>
          ) : (
            <div className="text-center p-8">
              <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">You're all set!</h3>
              <p className="text-muted-foreground">
                Enjoy unlimited goals and all premium features.
              </p>
            </div>
          )}

          <Button 
            variant="outline" 
            onClick={handleRestorePurchases}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? "Restoring..." : "Restore Purchases"}
          </Button>
        </div>

        {/* Subscription Info */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Subscriptions are managed through your device's app store
              </p>
              <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                <span>Cancel anytime</span>
                <span>•</span>
                <span>No commitment</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        trigger="premium_feature"
        title="Upgrade to Pro"
        description="Unlock unlimited goals and premium features to achieve more."
      />

      <BottomNav />
    </div>
  );
};

export default SubscriptionManagerScreen;