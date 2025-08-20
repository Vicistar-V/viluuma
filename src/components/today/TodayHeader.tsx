import React from 'react';
import { format, getHours } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useUserData } from '@/hooks/useUserData';
import { CheckCircle2, AlertTriangle, Lightbulb, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TodayHeaderProps {
  overdueCount: number;
}

const TodayHeader: React.FC<TodayHeaderProps> = ({ overdueCount }) => {
  const { user } = useAuth();
  const { data: userData } = useUserData();
  const today = new Date();
  const formattedDate = format(today, 'EEEE, MMMM d');
  const currentHour = getHours(today);
  
  const firstName = userData?.profile?.display_name?.split(' ')[0] || 
                   user?.user_metadata?.display_name?.split(' ')[0] || 
                   'there';

  // Get greeting with name
  const getGreeting = () => {
    const timeGreeting = currentHour < 12 ? 'Good morning' : currentHour < 17 ? 'Good afternoon' : 'Good evening';
    return `${timeGreeting}, ${firstName}`;
  };

  // Get status info based on overdue count
  const getStatusInfo = () => {
    if (overdueCount === 0) {
      return {
        message: "All tasks are on track",
        submessage: "You're crushing it today!",
        icon: CheckCircle2,
        variant: "success" as const,
        bgClass: "bg-gradient-to-br from-success/10 to-success/5",
        borderClass: "border-success/20"
      };
    } else if (overdueCount <= 5) {
      return {
        message: "A few items need attention",
        submessage: "Let's knock these out together",
        icon: Lightbulb,
        variant: "warning" as const,
        bgClass: "bg-gradient-to-br from-warning/15 to-warning/5",
        borderClass: "border-warning/30"
      };
    } else {
      return {
        message: "Priority items detected",
        submessage: "Focus mode activated - let's tackle these",
        icon: AlertTriangle,
        variant: "destructive" as const,
        bgClass: "bg-gradient-to-br from-destructive/15 to-destructive/5", 
        borderClass: "border-destructive/30"
      };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="mb-8 animate-fade-in">
      {/* Header Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-background to-muted/20 p-6 shadow-sm">
        {/* Date Badge */}
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">
            {formattedDate}
          </span>
        </div>
        
        {/* Greeting */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2 tracking-tight">
            {getGreeting()}
          </h1>
        </div>
        
        {/* Status Card */}
        <div className={cn(
          "relative p-4 rounded-xl border transition-all duration-300",
          statusInfo.bgClass,
          statusInfo.borderClass
        )}>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <div className={cn(
                "flex items-center justify-center w-10 h-10 rounded-full",
                statusInfo.variant === "success" && "bg-success/20",
                statusInfo.variant === "warning" && "bg-warning/20", 
                statusInfo.variant === "destructive" && "bg-destructive/20"
              )}>
                <statusInfo.icon className={cn(
                  "w-5 h-5",
                  statusInfo.variant === "success" && "text-success",
                  statusInfo.variant === "warning" && "text-warning",
                  statusInfo.variant === "destructive" && "text-destructive"
                )} />
              </div>
              
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-1">
                  {statusInfo.message}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {statusInfo.submessage}
                </p>
              </div>
            </div>
            
            {/* Overdue Count Badge */}
            {overdueCount > 0 && (
              <Badge 
                variant="secondary"
                className={cn(
                  "ml-3 font-semibold min-w-[2rem] h-8 flex items-center justify-center",
                  statusInfo.variant === "success" && "bg-success/20 text-success border-success/30",
                  statusInfo.variant === "warning" && "bg-warning/20 text-warning border-warning/30",
                  statusInfo.variant === "destructive" && "bg-destructive/20 text-destructive border-destructive/30"
                )}
              >
                {overdueCount}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TodayHeader;