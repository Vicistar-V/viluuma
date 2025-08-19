import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, ArrowRight, Sparkles } from "lucide-react";
import { useState } from "react";
import { PaywallModal } from "./PaywallModal";

interface UpgradePromptProps {
  variant?: 'card' | 'banner' | 'inline';
  trigger?: 'goal_limit' | 'archive_limit' | 'premium_feature';
  title?: string;
  description?: string;
  className?: string;
}

export const UpgradePrompt = ({ 
  variant = 'card',
  trigger = 'goal_limit',
  title,
  description,
  className = ""
}: UpgradePromptProps) => {
  const [showPaywall, setShowPaywall] = useState(false);

  const getContent = () => {
    switch (trigger) {
      case 'goal_limit':
        return {
          title: title || "Ready for More Goals?",
          description: description || "You've reached your 2-goal limit. Upgrade to Pro for unlimited goals.",
          cta: "Upgrade to Pro"
        };
      case 'archive_limit':
        return {
          title: title || "Goals Locked",
          description: description || "Some goals were archived due to plan limits. Upgrade to unlock them.",
          cta: "Unlock Goals"
        };
      case 'premium_feature':
        return {
          title: title || "Premium Feature",
          description: description || "This feature requires Pro. Upgrade to unlock advanced capabilities.",
          cta: "Get Pro"
        };
      default:
        return {
          title: "Upgrade Available",
          description: "Unlock premium features with Pro.",
          cta: "Upgrade"
        };
    }
  };

  const content = getContent();

  if (variant === 'banner') {
    return (
      <>
        <div className={`bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 border border-primary/20 rounded-lg p-4 ${className}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Crown className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">{content.title}</h3>
                <p className="text-xs text-muted-foreground">{content.description}</p>
              </div>
            </div>
            <Button 
              size="sm"
              onClick={() => setShowPaywall(true)}
              className="shrink-0"
            >
              <ArrowRight className="w-3 h-3 mr-1" />
              {content.cta}
            </Button>
          </div>
        </div>

        <PaywallModal
          isOpen={showPaywall}
          onClose={() => setShowPaywall(false)}
          trigger={trigger}
          title={title}
          description={description}
        />
      </>
    );
  }

  if (variant === 'inline') {
    return (
      <>
        <div className={`flex items-center gap-2 text-sm ${className}`}>
          <Crown className="h-4 w-4 text-primary" />
          <span className="text-muted-foreground">{content.description}</span>
          <Button 
            variant="link" 
            size="sm" 
            className="h-auto p-0 text-primary"
            onClick={() => setShowPaywall(true)}
          >
            {content.cta}
          </Button>
        </div>

        <PaywallModal
          isOpen={showPaywall}
          onClose={() => setShowPaywall(false)}
          trigger={trigger}
          title={title}
          description={description}
        />
      </>
    );
  }

  // Default card variant
  return (
    <>
      <Card className={`border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 ${className}`}>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="mx-auto p-3 rounded-full bg-gradient-to-br from-primary/10 to-accent/10 w-fit">
              <Crown className="h-6 w-6 text-primary" />
            </div>
            
            <div className="space-y-2">
              <h3 className="font-semibold">{content.title}</h3>
              <p className="text-sm text-muted-foreground">
                {content.description}
              </p>
            </div>

            <Button 
              onClick={() => setShowPaywall(true)}
              className="w-full"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {content.cta}
            </Button>
          </div>
        </CardContent>
      </Card>

      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        trigger={trigger}
        title={title}
        description={description}
      />
    </>
  );
};