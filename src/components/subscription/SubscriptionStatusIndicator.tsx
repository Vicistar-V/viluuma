import { Badge } from "@/components/ui/badge";
import { Crown, Zap } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";

interface SubscriptionStatusIndicatorProps {
  variant?: 'badge' | 'inline' | 'header';
  showGoalCount?: boolean;
}

export const SubscriptionStatusIndicator = ({ 
  variant = 'badge',
  showGoalCount = false 
}: SubscriptionStatusIndicatorProps) => {
  const subscription = useSubscription();

  if (subscription.isLoading) {
    return null;
  }

  if (variant === 'header') {
    return (
      <div className="flex items-center gap-2 text-sm">
        {subscription.entitlement === 'pro' ? (
          <>
            <Crown className="h-4 w-4 text-primary" />
            <span className="font-medium text-primary">Pro</span>
          </>
        ) : (
          <>
            <Zap className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Free</span>
            {showGoalCount && (
              <span className="text-xs text-muted-foreground">
                ({subscription.activeGoalCount}/{subscription.maxGoals})
              </span>
            )}
          </>
        )}
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        {subscription.entitlement === 'pro' ? (
          <>
            <Crown className="h-3 w-3 text-primary" />
            <span className="text-primary">Pro</span>
          </>
        ) : (
          <>
            <span>Free</span>
            {showGoalCount && (
              <span>({subscription.activeGoalCount}/{subscription.maxGoals})</span>
            )}
          </>
        )}
      </div>
    );
  }

  // Default badge variant
  return (
    <Badge 
      variant={subscription.entitlement === 'pro' ? 'default' : 'outline'}
      className={subscription.entitlement === 'pro' ? 'bg-primary text-primary-foreground' : ''}
    >
      {subscription.entitlement === 'pro' ? (
        <>
          <Crown className="h-3 w-3 mr-1" />
          Pro
        </>
      ) : (
        <>
          Free
          {showGoalCount && ` (${subscription.activeGoalCount}/${subscription.maxGoals})`}
        </>
      )}
    </Badge>
  );
};