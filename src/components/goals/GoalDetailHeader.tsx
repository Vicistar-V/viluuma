import { ArrowLeft, MoreVertical, PencilLine, Archive, CheckCircle, Trash2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { Link } from "react-router-dom";

interface Goal {
  id: string;
  title: string;
  status: 'active' | 'archived' | 'completed';
  modality: 'project' | 'checklist';
  archive_status: 'active' | 'user_archived' | 'system_archived';
  description?: string;
}

interface GoalDetailHeaderProps {
  goal: Goal;
  onTitleUpdate: (newTitle: string) => Promise<void>;
  onDescriptionUpdate?: (newDescription: string) => Promise<void>;
  onStatusChange: (status: 'active' | 'archived') => Promise<void>;
  onCompleteGoal?: () => Promise<void>;
  onReopenGoal?: () => Promise<void>;
  onDelete: () => Promise<void>;
}

export const GoalDetailHeader = ({ goal, onTitleUpdate, onDescriptionUpdate, onStatusChange, onCompleteGoal, onReopenGoal, onDelete }: GoalDetailHeaderProps) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(goal.title);

  const handleTitleSave = async () => {
    if (titleValue.trim() && titleValue !== goal.title) {
      await onTitleUpdate(titleValue.trim());
    }
    setIsEditingTitle(false);
  };

  const getStatusBadge = () => {
    switch (goal.status) {
      case 'completed':
        return (
          <Badge variant="default" className="bg-success text-success-foreground">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        );
      case 'archived':
        return (
          <Badge variant="secondary">
            <Archive className="w-3 h-3 mr-1" />
            Archived
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="border-primary text-primary">
            Active
          </Badge>
        );
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b bg-card/80">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              asChild
              className="shrink-0"
            >
              <Link to="/goals">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            
            <div className="flex-1 min-w-0">
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
                  className="text-xl font-semibold h-auto border-none px-0 bg-transparent focus-visible:ring-0"
                  autoFocus
                />
              ) : (
                <div>
                  <div className="flex items-center gap-2">
                    <h1 
                      className="text-xl font-semibold truncate cursor-pointer hover:text-primary transition-colors"
                      onClick={() => setIsEditingTitle(true)}
                    >
                      {goal.title}
                    </h1>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsEditingTitle(true)}
                      className="h-6 w-6 opacity-60 hover:opacity-100"
                    >
                      <PencilLine className="h-3 w-3" />
                    </Button>
                  </div>
                  {goal.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {goal.description}
                    </p>
                  )}
                </div>
              )}
              <div className="flex items-center gap-2 mt-1">
                {getStatusBadge()}
                <Badge variant="outline" className="capitalize text-xs">
                  {goal.modality}
                </Badge>
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
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
              {goal.status === 'archived' && (
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
      </div>
    </header>
  );
};