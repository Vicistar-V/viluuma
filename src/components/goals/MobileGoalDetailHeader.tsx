import React, { useState } from 'react';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useUserData } from '@/hooks/useUserData';
import { 
  ArrowLeft, 
  MoreVertical, 
  PencilLine, 
  Archive, 
  CheckCircle, 
  Trash2, 
  RotateCcw,
  Calendar,
  Target,
  List,
  CheckSquare,
  Crown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface Goal {
  id: string;
  title: string;
  status: 'active' | 'archived' | 'completed';
  modality: 'project' | 'checklist';
  archive_status: 'active' | 'user_archived' | 'system_archived';
  description?: string | null;
  total_tasks: number;
  completed_tasks: number;
  target_date?: string | null;
  weekly_hours?: number | null;
  created_at: string;
}

interface MobileGoalDetailHeaderProps {
  goal: Goal;
  onTitleUpdate: (newTitle: string) => Promise<void>;
  onDescriptionUpdate?: (newDescription: string) => Promise<void>;
  onStatusChange: (status: 'active' | 'archived') => Promise<void>;
  onCompleteGoal?: () => Promise<void>;
  onReopenGoal?: () => Promise<void>;
  onDelete: () => Promise<void>;
}

const MobileGoalDetailHeader: React.FC<MobileGoalDetailHeaderProps> = ({ 
  goal, 
  onTitleUpdate, 
  onDescriptionUpdate, 
  onStatusChange, 
  onCompleteGoal, 
  onReopenGoal, 
  onDelete 
}) => {
  const { user } = useAuth();
  const { data: userData } = useUserData();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(goal.title);
  const today = new Date();
  const formattedDate = format(today, 'EEEE, MMMM d');
  
  const firstName = userData?.profile?.display_name?.split(' ')[0] || 
                   user?.user_metadata?.display_name?.split(' ')[0] || 
                   'there';

  const handleTitleSave = async () => {
    if (titleValue.trim() && titleValue !== goal.title) {
      await onTitleUpdate(titleValue.trim());
    }
    setIsEditingTitle(false);
  };

  // Get status info based on goal status
  const getStatusInfo = () => {
    switch (goal.status) {
      case 'completed':
        return {
          message: "Congratulations!",
          submessage: "This goal has been completed",
          icon: CheckCircle,
          variant: "success" as const,
          bgClass: "bg-gradient-to-br from-success/10 to-success/5",
          borderClass: "border-success/20",
          badge: { text: "Completed", bg: "bg-success", color: "text-white" }
        };
      case 'archived':
        return {
          message: goal.archive_status === 'system_archived' ? "Goal archived by system" : "Goal archived",
          submessage: goal.archive_status === 'system_archived' ? "Upgrade to Pro to reactivate" : "Ready to reactivate anytime",
          icon: goal.archive_status === 'system_archived' ? Crown : Archive,
          variant: "muted" as const,
          bgClass: "bg-gradient-to-br from-muted/20 to-muted/5",
          borderClass: "border-muted/30",
          badge: { text: "Archived", bg: "bg-muted-foreground", color: "text-white" }
        };
      default:
        const progress = goal.total_tasks > 0 ? (goal.completed_tasks / goal.total_tasks) * 100 : 0;
        return {
          message: progress === 0 ? "Ready to start!" : `${Math.round(progress)}% complete`,
          submessage: `${goal.completed_tasks} of ${goal.total_tasks} tasks done`,
          icon: Target,
          variant: "default" as const,
          bgClass: "bg-gradient-to-br from-primary/10 to-accent/10",
          borderClass: "border-primary/20",
          badge: { text: "Active", bg: "bg-primary", color: "text-primary-foreground" }
        };
    }
  };

  const statusInfo = getStatusInfo();
  const ModalityIcon = goal.modality === 'project' ? Target : CheckSquare;

  return (
    <div className="animate-fade-in">
      {/* Floating Back Button */}
      <div className="fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          asChild
          className="rounded-full shadow-lg bg-background/80 backdrop-blur-sm border-muted-foreground/20"
        >
          <Link to="/goals">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* Floating Action Menu */}
      <div className="fixed top-4 right-4 z-50">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              size="icon" 
              className="rounded-full shadow-lg bg-background/80 backdrop-blur-sm border-muted-foreground/20"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 rounded-xl">
            {goal.status === 'active' && (
              <>
                <DropdownMenuItem onClick={onCompleteGoal}>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Mark Complete
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onStatusChange('archived')}>
                  <Archive className="w-4 h-4 mr-2" />
                  Archive
                </DropdownMenuItem>
              </>
            )}
            {goal.status === 'archived' && goal.archive_status !== 'system_archived' && (
              <DropdownMenuItem onClick={() => onStatusChange('active')}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Reactivate
              </DropdownMenuItem>
            )}
            {goal.status === 'completed' && (
              <DropdownMenuItem onClick={onReopenGoal}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Reopen
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={onDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Goal
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Main Header Card */}
      <div className="p-4 pt-16 pb-6">
        <Card className="rounded-2xl bg-gradient-to-br from-background to-muted/20 shadow-sm border-muted/30">
          <CardContent className="p-6">
            {/* Date Badge */}
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">
                {formattedDate}
              </span>
            </div>
            
            {/* Goal Title */}
            <div className="mb-6">
              {isEditingTitle ? (
                <Input
                  value={titleValue}
                  onChange={(e) => setTitleValue(e.target.value)}
                  onBlur={handleTitleSave}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleTitleSave();
                    if (e.key === 'Escape') {
                      setTitleValue(goal.title);
                      setIsEditingTitle(false);
                    }
                  }}
                  className="text-3xl font-bold h-auto border-none px-0 bg-transparent focus-visible:ring-0 resize-none"
                  autoFocus
                />
              ) : (
                <div 
                  className="flex items-start gap-2 cursor-pointer group"
                  onClick={() => setIsEditingTitle(true)}
                >
                  <h1 className="text-3xl font-bold text-foreground mb-2 tracking-tight flex-1">
                    {goal.title}
                  </h1>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-60 hover:opacity-100 transition-opacity shrink-0"
                  >
                    <PencilLine className="h-4 w-4" />
                  </Button>
                </div>
              )}
              
              {goal.description && (
                <p className="text-muted-foreground text-base mt-2 leading-relaxed">
                  {goal.description}
                </p>
              )}
            </div>

            {/* Badges */}
            <div className="flex items-center gap-2 mb-6">
              <Badge className={cn("rounded-full", statusInfo.badge.bg, statusInfo.badge.color)}>
                <statusInfo.icon className="w-3 h-3 mr-1" />
                {statusInfo.badge.text}
              </Badge>
              <Badge variant="outline" className="rounded-full">
                <ModalityIcon className="w-3 h-3 mr-1" />
                {goal.modality === 'project' ? 'Project' : 'Checklist'}
              </Badge>
              {goal.archive_status === 'system_archived' && (
                <Badge variant="outline" className="rounded-full border-warning/30 text-warning">
                  <Crown className="w-3 h-3 mr-1" />
                  Pro Required
                </Badge>
              )}
            </div>
            
            {/* Status Card */}
            <div className={cn(
              "relative p-4 rounded-xl border transition-all duration-300",
              statusInfo.bgClass,
              statusInfo.borderClass
            )}>
              <div className="flex items-start gap-3">
                <div className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full",
                  statusInfo.variant === "success" && "bg-success/20",
                  statusInfo.variant === "muted" && "bg-muted/30",
                  statusInfo.variant === "default" && "bg-primary/20"
                )}>
                  <statusInfo.icon className={cn(
                    "w-5 h-5",
                    statusInfo.variant === "success" && "text-success",
                    statusInfo.variant === "muted" && "text-muted-foreground",
                    statusInfo.variant === "default" && "text-primary"
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
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MobileGoalDetailHeader;