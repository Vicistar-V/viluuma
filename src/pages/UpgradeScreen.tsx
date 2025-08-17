import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Crown, Check, Sparkles, Target, Zap, Clock, Shield, Smartphone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUserStatus } from '@/hooks/useUserStatus';
import { useRevenueCat } from '@/hooks/useRevenueCat';
import { Capacitor } from '@capacitor/core';

export const UpgradeScreen = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { refreshStatus } = useUserStatus();
  const { packages, purchasePackage, restorePurchases, loading: rcLoading, isConfigured } = useRevenueCat();
  const [loading, setLoading] = useState(false);

  const features = [
    {
      icon: <Target className="w-5 h-5" />,
      title: "Unlimited Goals",
      description: "Create as many goals as you want"
    },
    {
      icon: <Sparkles className="w-5 h-5" />,
      title: "AI Planning",
      description: "Smart task scheduling and planning"
    },
    {
      icon: <Zap className="w-5 h-5" />,
      title: "Priority Intelligence",
      description: "Focus on what matters most"
    },
    {
      icon: <Clock className="w-5 h-5" />,
      title: "Advanced Scheduling",
      description: "Time-aware task management"
    },
    {
      icon: <Shield className="w-5 h-5" />,
      title: "Goal Recovery",
      description: "Never lose your progress again"
    }
  ];

  const handlePurchase = async () => {
    if (!Capacitor.isNativePlatform()) {
      toast({
        title: "Mobile App Required",
        description: "Subscription purchases are only available in the mobile app. Please download and use the mobile version.",
        variant: "default"
      });
      return;
    }

    if (!isConfigured || packages.length === 0) {
      toast({
        title: "Not Available",
        description: "Subscription packages are not available at this time.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Use the first available package (typically monthly subscription)
      const packageToPurchase = packages[0];
      const success = await purchasePackage(packageToPurchase);
      
      if (success) {
        // Refresh user status
        await refreshStatus();
        
        // Navigate back to goals
        navigate('/goals');
      }
    } catch (error) {
      console.error('Purchase error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestorePurchases = async () => {
    if (!Capacitor.isNativePlatform()) {
      toast({
        title: "Mobile App Required",
        description: "Restore purchases is only available in the mobile app.",
        variant: "default"
      });
      return;
    }

    setLoading(true);
    try {
      const success = await restorePurchases();
      if (success) {
        await refreshStatus();
      }
    } catch (error) {
      console.error('Restore error:', error);
    } finally {
      setLoading(false);
    }
  };

  const isNative = Capacitor.isNativePlatform();
  const purchaseButtonDisabled = loading || rcLoading || (!isNative && true);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <div className="sticky top-0 bg-background/80 backdrop-blur-sm border-b">
        <div className="max-w-2xl mx-auto p-4 flex items-center space-x-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            Upgrade to Pro
          </h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Hero Section */}
        <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 to-purple-500/5">
          <div className="absolute top-4 right-4">
            <Crown className="w-8 h-8 text-primary opacity-20" />
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 rounded-full bg-primary/10">
                <Crown className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Viluuma Pro</h2>
                <p className="text-muted-foreground">Unlock your full potential</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Features */}
        <Card>
          <div className="p-6 space-y-4">
            <h3 className="text-lg font-semibold">What's included:</h3>
            <div className="space-y-4">
              {features.map((feature, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary mt-0.5">
                    {feature.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium">{feature.title}</h4>
                      <Check className="w-4 h-4 text-green-500" />
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Pricing Card */}
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-background">
          <div className="p-6 space-y-4">
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center space-x-2">
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  Most Popular
                </Badge>
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-bold">$7.99</div>
                <div className="text-muted-foreground">per month</div>
              </div>
            </div>
            
            {!isNative && (
              <Card className="p-4 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
                <div className="flex items-start space-x-3">
                  <Smartphone className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      Mobile App Required
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      Subscription purchases are available in our mobile app. Download from the App Store or Google Play.
                    </p>
                  </div>
                </div>
              </Card>
            )}

            <Button 
              size="lg" 
              className="w-full text-lg font-semibold"
              onClick={handlePurchase}
              disabled={purchaseButtonDisabled}
            >
              {loading || rcLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin mr-2" />
                  Processing...
                </>
              ) : isNative ? (
                "Start Pro Subscription"
              ) : (
                "Get Mobile App"
              )}
            </Button>

            {isNative && (
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={handleRestorePurchases}
                disabled={loading || rcLoading}
              >
                Restore Purchases
              </Button>
            )}
          </div>
        </Card>

        {/* Comparison Table */}
        <Card>
          <div className="p-6 space-y-4">
            <h3 className="text-lg font-semibold">Free vs Pro</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-4 pb-2 border-b text-sm font-medium">
                <div>Feature</div>
                <div className="text-center">Free</div>
                <div className="text-center">Pro</div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>Active Goals</div>
                <div className="text-center">2</div>
                <div className="text-center text-primary font-medium">Unlimited</div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>AI Planning</div>
                <div className="text-center">Basic</div>
                <div className="text-center text-primary font-medium">Advanced</div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>Goal Recovery</div>
                <div className="text-center">❌</div>
                <div className="text-center text-primary font-medium">✅</div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>Priority Intelligence</div>
                <div className="text-center">❌</div>
                <div className="text-center text-primary font-medium">✅</div>
              </div>
            </div>
          </div>
        </Card>

        {/* Trust Indicators */}
        <div className="grid grid-cols-3 gap-4 text-center text-sm text-muted-foreground">
          <div className="space-y-2">
            <Shield className="w-6 h-6 mx-auto text-green-500" />
            <div>Secure Payment</div>
          </div>
          <div className="space-y-2">
            <Zap className="w-6 h-6 mx-auto text-blue-500" />
            <div>Instant Access</div>
          </div>
          <div className="space-y-2">
            <Crown className="w-6 h-6 mx-auto text-purple-500" />
            <div>Premium Support</div>
          </div>
        </div>
      </div>
    </div>
  );
};