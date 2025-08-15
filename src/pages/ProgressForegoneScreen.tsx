import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Clock, Target, Users, Sparkles, Crown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Goal } from '@/hooks/useGoals';
import { useToast } from '@/hooks/use-toast';

export const ProgressForegoneScreen = () => {
  const { goalId } = useParams<{ goalId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [goal, setGoal] = useState<Goal | null>(null);
  const [loading, setLoading] = useState(true);
  const [daysLost, setDaysLost] = useState(0);

  useEffect(() => {
    const fetchGoalData = async () => {
      if (!goalId) return;
      
      try {
        const { data, error } = await supabase
          .from('goals_with_computed_status')
          .select('*')
          .eq('id', goalId)
          .single();

        if (error) throw error;
        
        setGoal(data as Goal);
        
        // Calculate days since the goal was archived (simulated as days since creation for demo)
        const createdDate = new Date(data.created_at);
        const now = new Date();
        const daysDiff = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
        setDaysLost(Math.max(1, daysDiff));
        
      } catch (error) {
        console.error('Error fetching goal:', error);
        toast({
          title: "Error",
          description: "Could not load goal data",
          variant: "destructive"
        });
        navigate('/goals');
      } finally {
        setLoading(false);
      }
    };

    fetchGoalData();
  }, [goalId, navigate, toast]);

  const handleUpgrade = () => {
    navigate('/upgrade');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading your goal...</p>
        </div>
      </div>
    );
  }

  if (!goal) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold">Goal not found</h2>
          <Button onClick={() => navigate('/goals')}>
            Back to Goals
          </Button>
        </div>
      </div>
    );
  }

  const completionPercentage = goal.total_tasks > 0 
    ? Math.round((goal.completed_tasks / goal.total_tasks) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <div className="sticky top-0 bg-background/80 backdrop-blur-sm border-b">
        <div className="max-w-2xl mx-auto p-4 flex items-center space-x-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/goals')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">Progress Foregone</h1>
            <p className="text-sm text-muted-foreground">See what you're missing</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Hero Section */}
        <Card className="p-6 border-destructive/20 bg-gradient-to-br from-destructive/5 to-transparent">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
              <Clock className="w-8 h-8 text-destructive" />
            </div>
            
            <div>
              <h2 className="text-2xl font-bold text-destructive mb-2">
                {daysLost} Days Lost
              </h2>
              <p className="text-muted-foreground">
                Time that could have been spent on "{goal.title}"
              </p>
            </div>
          </div>
        </Card>

        {/* Goal Progress Ghost */}
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-muted-foreground line-through">
                {goal.title}
              </h3>
              <Badge variant="outline" className="text-destructive border-destructive">
                Archived
              </Badge>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress made</span>
                <span className="text-muted-foreground">
                  {goal.completed_tasks} of {goal.total_tasks} tasks
                </span>
              </div>
              <Progress value={completionPercentage} className="h-3" />
              <p className="text-sm text-muted-foreground">
                You were {completionPercentage}% of the way there...
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <Target className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm font-medium text-muted-foreground">
                  {goal.total_tasks - goal.completed_tasks} Tasks Left
                </p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <Clock className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm font-medium text-muted-foreground">
                  {daysLost} Days Passed
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Social Proof */}
        <Card className="p-6 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <div className="flex items-start space-x-4">
            <Users className="w-6 h-6 text-primary mt-1" />
            <div>
              <h4 className="font-semibold mb-2">What Pro users are saying:</h4>
              <blockquote className="text-sm italic text-muted-foreground mb-2">
                "I wish I had upgraded sooner. Getting my archived goals back gave me the motivation to finally finish what I started."
              </blockquote>
              <p className="text-xs text-muted-foreground">- Sarah K., Pro user</p>
            </div>
          </div>
        </Card>

        {/* Reactivation CTA */}
        <Card className="p-6 border-primary bg-gradient-to-r from-primary to-primary-glow text-primary-foreground">
          <div className="text-center space-y-4">
            <Crown className="w-12 h-12 mx-auto" />
            <div>
              <h3 className="text-xl font-bold mb-2">
                Reactivate Your Dreams
              </h3>
              <p className="text-sm opacity-90">
                Upgrade to Pro and instantly restore all your archived goals. 
                Pick up exactly where you left off.
              </p>
            </div>
            
            <div className="space-y-3">
              <Button 
                onClick={handleUpgrade}
                size="lg"
                className="w-full bg-background text-primary hover:bg-background/90"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Upgrade to Pro Now
              </Button>
              
              <p className="text-xs opacity-75">
                Start your journey again • Unlimited goals • Cancel anytime
              </p>
            </div>
          </div>
        </Card>

        {/* Alternative Action */}
        <div className="text-center">
          <Button 
            variant="ghost"
            onClick={() => navigate('/goals')}
            className="text-muted-foreground"
          >
            Maybe later, take me back
          </Button>
        </div>
      </div>
    </div>
  );
};