import { Loader2Icon, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  show: boolean;
  title?: string;
  description?: string;
}

export const PlanUpdateOverlay = ({ 
  show, 
  title = "Updating your plan...", 
  description = "Calculating the ripple effects and adjusting your schedule" 
}: Props) => {
  if (!show) return null;

  return (
    <div className={cn(
      "fixed inset-0 z-50 bg-background/80 backdrop-blur-sm",
      "flex items-center justify-center"
    )}>
      <div className="bg-card border rounded-lg shadow-lg p-8 max-w-sm w-full mx-4">
        <div className="text-center space-y-6">
          {/* Animated Icon */}
          <div className="relative mx-auto w-16 h-16">
            <Loader2Icon className="w-16 h-16 animate-spin text-primary" />
            <Sparkles className="w-6 h-6 text-primary/60 absolute top-2 right-2 animate-pulse" />
          </div>
          
          {/* Content */}
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          
          {/* Progress Visualization */}
          <div className="space-y-2">
            <div className="flex justify-center space-x-1">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-2 h-2 rounded-full bg-primary",
                    "animate-pulse"
                  )}
                  style={{
                    animationDelay: `${i * 0.5}s`,
                    animationDuration: '1.5s'
                  }}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Smart algorithms at work ✨
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};