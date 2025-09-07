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
  onDismiss: () => void;
}

export const CoachingNudgeToast = ({ nudge, onDismiss }: CoachingNudgeToastProps) => {
  useEffect(() => {
    // Auto-dismiss after 5 seconds (shorter since acknowledgment is automatic)
    const timer = setTimeout(() => {
      onDismiss();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <Card className="fixed top-4 left-4 right-4 z-50 shadow-lg border-primary/30 bg-background/95 animate-in slide-in-from-top-2 duration-300">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <MessageCircle className="h-5 w-5 text-primary" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-foreground mb-1">
              {nudge.title}
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed mb-2">
              {nudge.body}
            </p>
            <p className="text-xs text-muted-foreground/70 italic">
              ✓ Acknowledged automatically
            </p>
          </div>

          <div className="flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="p-1 h-auto opacity-60 hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};