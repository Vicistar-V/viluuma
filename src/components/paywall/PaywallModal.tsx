import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Crown, 
  Zap, 
  Target, 
  Calendar, 
  Sparkles, 
  Check,
  X,
  Loader2
} from "lucide-react";
import { useRevenueCat } from "@/hooks/useSubscription";

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  trigger?: 'goal_limit' | 'archive_limit' | 'premium_feature';
  title?: string;
  description?: string;
}

export const PaywallModal = ({ 
  isOpen, 
  onClose, 
  trigger = 'goal_limit',
  title,
  description 
}: PaywallModalProps) => {
  const { purchasePro, restorePurchases, isLoading } = useRevenueCat();

  const getTriggerContent = () => {
    switch (trigger) {
      case 'goal_limit':
        return {
          title: title || "Ready for More Goals?",
          description: description || "You've reached your 2-goal limit on the free plan. Upgrade to Pro to create unlimited goals and unlock your full potential.",
          icon: Target,
          color: "text-primary"
        };
      case 'archive_limit':
        return {
          title: title || "Unlock Your Archived Goals",
          description: description || "These goals were automatically archived when your trial ended. Upgrade to Pro to reactivate them instantly.",
          icon: Crown,
          color: "text-warning"
        };
      case 'premium_feature':
        return {
          title: title || "Premium Feature",
          description: description || "This feature is available with Pro. Upgrade to unlock the full power of goal planning.",
          icon: Sparkles,
          color: "text-accent"
        };
      default:
        return {
          title: "Upgrade to Pro",
          description: "Unlock unlimited goals and premium features.",
          icon: Crown,
          color: "text-primary"
        };
    }
  };

  const triggerContent = getTriggerContent();
  const TriggerIcon = triggerContent.icon;

  const handlePurchase = async () => {
    try {
      await purchasePro.mutateAsync();
      onClose();
    } catch (error) {
      // Error handling is done in the mutation
    }
  };

  const handleRestore = async () => {
    try {
      await restorePurchases.mutateAsync();
    } catch (error) {
      // Error handling is done in the mutation
    }
  };

  const features = [
    {
      name: "Unlimited Goals",
      free: "2 goals",
      pro: "Unlimited",
      highlight: true
    },
    {
      name: "Smart Planning",
      free: "Basic",
      pro: "AI-powered",
      highlight: true
    },
    {
      name: "Archive & Organize",
      free: "Limited",
      pro: "Unlimited",
      highlight: false
    },
    {
      name: "Progress Analytics",
      free: "Basic stats",
      pro: "Advanced insights",
      highlight: false
    },
    {
      name: "Mobile Sync",
      free: true,
      pro: true,
      highlight: false
    }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center space-y-4">
          <div className="mx-auto p-3 rounded-full bg-gradient-to-br from-primary/10 to-accent/10">
            <TriggerIcon className={`h-8 w-8 ${triggerContent.color}`} />
          </div>
          <div>
            <h2 className="text-2xl font-bold">{triggerContent.title}</h2>
            <p className="text-muted-foreground mt-2">
              {triggerContent.description}
            </p>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Pricing Card */}
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
            <CardContent className="pt-6">
              <div className="text-center space-y-3">
                <Badge className="bg-primary text-primary-foreground">
                  <Crown className="w-3 h-3 mr-1" />
                  Most Popular
                </Badge>
                <div>
                  <div className="text-3xl font-bold">Pro Plan</div>
                  <div className="text-lg text-muted-foreground">
                    <span className="text-2xl font-semibold text-foreground">$4.99</span>
                    /month
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  Cancel anytime • 7-day free trial
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Feature Comparison */}
          <div className="space-y-3">
            <h3 className="font-semibold text-center">What's Included</h3>
            <div className="space-y-2">
              {features.map((feature, index) => (
                <div 
                  key={index} 
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    feature.highlight ? 'bg-primary/5 border border-primary/20' : 'bg-muted/30'
                  }`}
                >
                  <span className="font-medium">{feature.name}</span>
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground">Free</div>
                      <div className="text-sm">
                        {typeof feature.free === 'boolean' ? (
                          feature.free ? (
                            <Check className="h-4 w-4 text-success mx-auto" />
                          ) : (
                            <X className="h-4 w-4 text-destructive mx-auto" />
                          )
                        ) : (
                          feature.free
                        )}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground">Pro</div>
                      <div className="text-sm font-semibold text-primary">
                        {typeof feature.pro === 'boolean' ? (
                          feature.pro ? (
                            <Check className="h-4 w-4 text-success mx-auto" />
                          ) : (
                            <X className="h-4 w-4 text-destructive mx-auto" />
                          )
                        ) : (
                          feature.pro
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button 
              onClick={handlePurchase}
              disabled={isLoading}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Start Free Trial
                </>
              )}
            </Button>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={onClose}
                className="flex-1"
                disabled={isLoading}
              >
                Maybe Later
              </Button>
              <Button 
                variant="ghost" 
                onClick={handleRestore}
                className="flex-1"
                disabled={isLoading}
              >
                Restore Purchases
              </Button>
            </div>
          </div>

          {/* Trust Indicators */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                No commitment
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Cancel anytime
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              Subscription managed through your app store
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};