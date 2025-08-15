import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, MessageCircle, Crown } from 'lucide-react';
import { useCoachingMessages, useMarkMessageRead } from '@/hooks/useCoachingMessages';
import { useUserStatus } from '@/hooks/useUserStatus';

export const CoachTipBanner = () => {
  const { data: messages, isLoading } = useCoachingMessages();
  const { mutate: markAsRead } = useMarkMessageRead();
  const { subscriptionStatus, trialDaysLeft } = useUserStatus();
  const [dismissedMessageIds, setDismissedMessageIds] = useState<string[]>([]);

  if (isLoading || !messages?.length) return null;

  // Filter out dismissed messages
  const activeMessage = messages.find(msg => !dismissedMessageIds.includes(msg.id));
  
  if (!activeMessage) return null;

  const handleDismiss = () => {
    setDismissedMessageIds(prev => [...prev, activeMessage.id]);
    markAsRead(activeMessage.id);
  };

  const getBannerStyle = () => {
    if (subscriptionStatus === 'trial') {
      return 'border-primary/30 bg-gradient-to-r from-primary/10 to-primary-glow/10';
    }
    return 'border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50';
  };

  const getIconColor = () => {
    if (subscriptionStatus === 'trial') {
      return 'text-primary';
    }
    return 'text-orange-600';
  };

  return (
    <Card className={`relative p-4 mb-4 ${getBannerStyle()}`}>
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2 h-6 w-6 p-0"
        onClick={handleDismiss}
      >
        <X className="w-4 h-4" />
      </Button>

      <div className="flex items-start space-x-3 pr-8">
        <div className={`mt-0.5 ${getIconColor()}`}>
          {subscriptionStatus === 'trial' ? (
            <Crown className="w-5 h-5" />
          ) : (
            <MessageCircle className="w-5 h-5" />
          )}
        </div>
        
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <h4 className="font-medium text-sm">
              {activeMessage.title}
            </h4>
            {subscriptionStatus === 'trial' && trialDaysLeft !== null && (
              <Badge variant="secondary" className="text-xs">
                {trialDaysLeft} days left
              </Badge>
            )}
          </div>
          
          <p className="text-sm text-muted-foreground">
            {activeMessage.content}
          </p>
        </div>
      </div>
    </Card>
  );
};