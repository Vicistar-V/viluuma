import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Crown, Check, Sparkles, Target, Zap, Clock, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUserStatus } from '@/hooks/useUserStatus';

export const UpgradeScreen = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { refreshStatus } = useUserStatus();
  const queryClient = useQueryClient();
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

  const handlePurchase = async (productId: string) => {
    setLoading(true);
    
    try {
      // Simulate Google Play purchase flow
      const simulatedPurchaseToken = `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Call our verification edge function
      const { data, error } = await supabase.functions.invoke('verify-google-purchase', {
        body: {
          purchaseToken: simulatedPurchaseToken,
          productId: productId,
          packageName: 'app.lovable.be90748d9eb2423e8629af106fe98bf4'
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Welcome to Pro! 🎉",
          description: "Your subscription is now active. All features unlocked!",
        });

        // Refresh user status and goals data
        await refreshStatus();
        queryClient.invalidateQueries({ queryKey: ['goals'] });
        
        // Navigate back to goals
        navigate('/goals');
      } else {
        throw new Error(data.error || 'Purchase verification failed');
      }

    } catch (error) {
      console.error('Purchase error:', error);
      toast({
        title: "Purchase Failed",
        description: "There was an issue processing your purchase. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <div className="sticky top-0 bg-background/80 backdrop-blur-sm border-b">
        <div className="max-w-2xl mx-auto p-4 flex items-center space-x-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">Upgrade to Pro</h1>
            <p className="text-sm text-muted-foreground">Unlock your full potential</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Hero Section */}
        <Card className="p-6 border-primary bg-gradient-to-r from-primary to-primary-glow text-primary-foreground">
          <div className="text-center space-y-4">
            <Crown className="w-16 h-16 mx-auto" />
            
            <div>
              <Badge className="mb-3 bg-background/20 text-primary-foreground border-background/30">
                Most Popular
              </Badge>
              <h2 className="text-2xl font-bold mb-2">
                Viluuma Pro
              </h2>
              <p className="text-lg opacity-90">
                Everything you need to achieve your goals
              </p>
            </div>
          </div>
        </Card>

        {/* Features List */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">What's included:</h3>
          <div className="space-y-4">
            {features.map((feature, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className="text-primary mt-0.5">
                  {feature.icon}
                </div>
                <div>
                  <h4 className="font-medium">{feature.title}</h4>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
                <Check className="w-4 h-4 text-green-500 mt-1 ml-auto" />
              </div>
            ))}
          </div>
        </Card>

        {/* Pricing Card */}
        <Card className="p-6 border-primary/20">
          <div className="text-center space-y-4">
            <div>
              <p className="text-3xl font-bold">$9.99</p>
              <p className="text-sm text-muted-foreground">per month</p>
            </div>
            
            <Button 
              onClick={() => handlePurchase('viluuma_pro_monthly')}
              disabled={loading}
              size="lg"
              className="w-full bg-gradient-to-r from-primary to-primary-glow"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <Sparkles className="w-5 h-5 mr-2" />
              )}
              {loading ? 'Processing...' : 'Start Pro Subscription'}
            </Button>
            
            <p className="text-xs text-muted-foreground">
              Cancel anytime • Secure payment • Instant activation
            </p>
          </div>
        </Card>

        {/* Comparison */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4 bg-muted/50">
            <h4 className="font-medium mb-3 text-center">Free Plan</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center space-x-2">
                <div className="w-1 h-1 rounded-full bg-muted-foreground" />
                <span>2 active goals</span>
              </li>
              <li className="flex items-center space-x-2">
                <div className="w-1 h-1 rounded-full bg-muted-foreground" />
                <span>Basic planning</span>
              </li>
              <li className="flex items-center space-x-2">
                <div className="w-1 h-1 rounded-full bg-muted-foreground" />
                <span>Limited features</span>
              </li>
            </ul>
          </Card>

          <Card className="p-4 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <h4 className="font-medium mb-3 text-center">Pro Plan</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center space-x-2">
                <Check className="w-3 h-3 text-primary" />
                <span>Unlimited goals</span>
              </li>
              <li className="flex items-center space-x-2">
                <Check className="w-3 h-3 text-primary" />
                <span>AI-powered planning</span>
              </li>
              <li className="flex items-center space-x-2">
                <Check className="w-3 h-3 text-primary" />
                <span>All features included</span>
              </li>
            </ul>
          </Card>
        </div>

        {/* Trust Indicators */}
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Trusted by thousands of goal achievers
          </p>
          <div className="flex justify-center space-x-4 text-xs text-muted-foreground">
            <span>🔒 Secure Payment</span>
            <span>⚡ Instant Access</span>
            <span>🛡️ Privacy Protected</span>
          </div>
        </div>
      </div>
    </div>
  );
};