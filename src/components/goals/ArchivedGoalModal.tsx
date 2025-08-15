import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, Sparkles, ArrowRight, Calendar } from "lucide-react";
import { differenceInDays, format } from "date-fns";

interface Task {
  id: string;
  goal_id: string;
  milestone_id: string;
  user_id: string;
  title: string;
  description?: string | null;
  status: 'pending' | 'completed';
  priority?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  duration_hours?: number | null;
  is_anchored: boolean;
}

interface Milestone {
  id: string;
  goal_id: string;
  title: string;
  status: string;
  order_index: number | null;
  total_tasks: number;
  completed_tasks: number;
}

interface Goal {
  id: string;
  title: string;
  status: 'active' | 'archived' | 'completed';
  modality: 'project' | 'checklist';
  total_tasks: number;
  completed_tasks: number;
  target_date?: string | null;
  weekly_hours?: number | null;
  created_at: string;
  completed_at?: string | null;
  is_archived: boolean;
}

interface ArchivedGoalModalProps {
  goal: Goal | null;
  milestones: Milestone[];
  groupedTasks: Record<string, Task[]>;
  onClose: () => void;
  onReactivate: () => Promise<void>;
}

export const ArchivedGoalModal = ({ 
  goal, 
  milestones, 
  groupedTasks, 
  onClose, 
  onReactivate 
}: ArchivedGoalModalProps) => {
  if (!goal) return null;

  const daysSinceArchived = goal.completed_at 
    ? differenceInDays(new Date(), new Date(goal.completed_at))
    : differenceInDays(new Date(), new Date(goal.created_at));

  const progress = goal.total_tasks > 0 ? Math.round((goal.completed_tasks / goal.total_tasks) * 100) : 0;
  const remainingTasks = goal.total_tasks - goal.completed_tasks;

  // Show first 2 milestones as preview
  const previewMilestones = milestones.slice(0, 2);

  return (
    <Dialog open={!!goal} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Lock className="h-6 w-6 text-muted-foreground" />
            <div>
              <DialogTitle className="text-left">{goal.title}</DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary">
                  Archived Goal
                </Badge>
                <Badge variant="outline" className="capitalize">
                  {goal.modality}
                </Badge>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Loss of Progress Message */}
          <Card className="bg-gradient-to-br from-warning/10 via-background to-warning/5 border-warning/30">
            <CardContent className="pt-6">
              <div className="text-center space-y-3">
                <Sparkles className="h-8 w-8 mx-auto text-warning" />
                <h3 className="font-semibold text-warning">
                  {daysSinceArchived} Days of Potential Progress Lost
                </h3>
                <p className="text-muted-foreground">
                  You had {progress}% complete with only {remainingTasks} tasks remaining. 
                  That's incredible progress that's now on hold.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Ghost Timeline Preview */}
          <div className="space-y-4">
            <h4 className="font-medium text-muted-foreground">Your Plan Preview</h4>
            
            {previewMilestones.map((milestone) => {
              const milestoneTasks = (groupedTasks[milestone.id] || []).slice(0, 3);
              
              return (
                <Card key={milestone.id} className="opacity-60">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-5 h-5 rounded-full border-2 border-muted-foreground bg-muted" />
                      <h5 className="font-medium text-muted-foreground">
                        {milestone.title}
                      </h5>
                      <span className="text-sm text-muted-foreground">
                        ({milestone.completed_tasks}/{milestone.total_tasks})
                      </span>
                    </div>
                    
                    <div className="ml-7 space-y-2">
                      {milestoneTasks.map((task) => (
                        <div key={task.id} className="flex items-center gap-2">
                          <input 
                            type="checkbox" 
                            checked={task.status === 'completed'}
                            disabled 
                            className="h-4 w-4 opacity-50"
                          />
                          <span className={`text-sm ${
                            task.status === 'completed' 
                              ? 'line-through text-muted-foreground' 
                              : 'text-muted-foreground'
                          }`}>
                            {task.title}
                          </span>
                          {goal.modality === 'project' && task.end_date && (
                            <span className="text-xs text-muted-foreground">
                              Due {format(new Date(task.end_date), 'MMM dd')}
                            </span>
                          )}
                        </div>
                      ))}
                      
                      {(groupedTasks[milestone.id] || []).length > 3 && (
                        <div className="text-xs text-muted-foreground">
                          ... and {(groupedTasks[milestone.id] || []).length - 3} more tasks
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            
            {milestones.length > 2 && (
              <div className="text-center text-sm text-muted-foreground">
                ... and {milestones.length - 2} more milestones in your complete plan
              </div>
            )}
          </div>

          {/* Time-sensitive messaging */}
          {goal.target_date && (
            <Card className="bg-gradient-to-br from-destructive/10 via-background to-destructive/5 border-destructive/30">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-destructive" />
                  <span className="text-sm">
                    Original target: {format(new Date(goal.target_date), 'PPP')}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Every day this goal stays archived is another day away from your target.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Call to Action */}
          <div className="space-y-4">
            <Card className="bg-gradient-to-br from-primary/10 via-background to-primary/5 border-primary/30">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <h3 className="font-semibold text-primary">
                    Ready to Reclaim Your Ambition?
                  </h3>
                  <p className="text-muted-foreground">
                    Reactivate this goal and pick up right where you left off. 
                    Your progress is preserved and waiting for you.
                  </p>
                  
                  <div className="flex gap-3 justify-center">
                    <Button variant="outline" onClick={onClose}>
                      Not Yet
                    </Button>
                    <Button onClick={onReactivate} className="bg-primary">
                      <ArrowRight className="w-4 h-4 mr-2" />
                      Reactivate Goal
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};