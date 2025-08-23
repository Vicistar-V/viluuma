import React from 'react';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useUserData } from '@/hooks/useUserData';
import { Target, TrendingUp, CheckCircle, Archive, Crown, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface GoalsStats {
  total: number;
  active: number;
  completed: number;
  archived: number;
}

interface GoalsHeaderProps {
  stats: GoalsStats;
  hasSystemArchived?: boolean;
}

const GoalsHeader: React.FC<GoalsHeaderProps> = ({ stats, hasSystemArchived = false }) => {
  const { user } = useAuth();
  const { data: userData } = useUserData();
  const today = new Date();
  const formattedDate = format(today, 'EEEE, MMMM d');
  
  const firstName = userData?.profile?.display_name?.split(' ')[0] || 
                   user?.user_metadata?.display_name?.split(' ')[0] || 
                   'there';

  // Get motivational message based on stats
  const getMotivationalInfo = () => {
    if (stats.total === 0) {
      return {
        message: "Ready to set your first goal?",
        submessage: "Let's turn your dreams into actionable plans",
        icon: Target,
        variant: "default" as const,
        bgClass: "bg-gradient-to-br from-primary/10 to-accent/10",
        borderClass: "border-primary/20"
      };
    } else if (stats.active === 0 && stats.total > 0) {
      return {
        message: "Time for new challenges",
        submessage: "Your goals are waiting for you",
        icon: TrendingUp,
        variant: "secondary" as const,
        bgClass: "bg-gradient-to-br from-blue-500/10 to-blue-600/5",
        borderClass: "border-blue-500/20"
      };
    } else if (stats.completed > stats.active) {
      return {
        message: "You're on fire!",
        submessage: "Amazing progress on your goals",
        icon: CheckCircle,
        variant: "success" as const,
        bgClass: "bg-gradient-to-br from-success/10 to-success/5",
        borderClass: "border-success/20"
      };
    } else {
      return {
        message: "Keep the momentum going",
        submessage: `${stats.active} active goals in progress`,
        icon: TrendingUp,
        variant: "default" as const,
        bgClass: "bg-gradient-to-br from-primary/10 to-accent/10",
        borderClass: "border-primary/20"
      };
    }
  };

  const motivationInfo = getMotivationalInfo();

  return (
    <div className="mb-6 animate-fade-in">
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
            Goals Dashboard
          </h1>
          <p className="text-lg text-muted-foreground">
            Welcome back, {firstName}
          </p>
        </div>
        
        {/* Stats Overview Cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          </div>
          
          <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Active</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.active}</p>
          </div>
          
          <div className="p-4 rounded-xl bg-gradient-to-br from-success/10 to-success/5 border border-success/20">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-success" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Done</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.completed}</p>
          </div>
          
          <div className="p-4 rounded-xl bg-gradient-to-br from-muted/20 to-muted/5 border border-muted/30">
            <div className="flex items-center gap-2 mb-2">
              <Archive className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Archive</span>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold text-foreground">{stats.archived}</p>
              {hasSystemArchived && (
                <Crown className="w-4 h-4 text-warning" />
              )}
            </div>
          </div>
        </div>
        
        {/* Motivation Card */}
        <div className={cn(
          "relative p-4 rounded-xl border transition-all duration-300",
          motivationInfo.bgClass,
          motivationInfo.borderClass
        )}>
          <div className="flex items-start gap-3">
            <div className={cn(
              "flex items-center justify-center w-10 h-10 rounded-full",
              motivationInfo.variant === "success" && "bg-success/20",
              motivationInfo.variant === "secondary" && "bg-blue-500/20",
              motivationInfo.variant === "default" && "bg-primary/20"
            )}>
              <motivationInfo.icon className={cn(
                "w-5 h-5",
                motivationInfo.variant === "success" && "text-success",
                motivationInfo.variant === "secondary" && "text-blue-500",
                motivationInfo.variant === "default" && "text-primary"
              )} />
            </div>
            
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-1">
                {motivationInfo.message}
              </h3>
              <p className="text-sm text-muted-foreground">
                {motivationInfo.submessage}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoalsHeader;