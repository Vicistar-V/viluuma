import { useEffect } from 'react';
import { X, MessageCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface CoachingNudge {
  id: string;
  message_type: string;
  title: string;
  body: string;
  created_at: string;
}

interface CoachingNudgeToastProps {
  nudge: CoachingNudge;
  onAcknowledge: (messageId: string) => void;
  onDismiss: () => void;
}

export const CoachingNudgeToast = ({ nudge, onAcknowledge, onDismiss }: CoachingNudgeToastProps) => {
  useEffect(() => {
    // Auto-dismiss after 10 seconds if not interacted with
    const timer = setTimeout(() => {
      onDismiss();
    }, 10000);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  const handleAcknowledge = () => {
    onAcknowledge(nudge.id);
    onDismiss();
  };

  return (
    <Card className="fixed top-4 left-4 right-4 z-50 shadow-lg border-primary/20 bg-background/95 backdrop-blur-sm">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <MessageCircle className="h-5 w-5 text-primary" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-foreground mb-1">
              {nudge.title}
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {nudge.body}
            </p>
          </div>

          <div className="flex gap-2 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAcknowledge}
              className="text-primary hover:text-primary/80"
            >
              Got it
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="p-1 h-auto"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};