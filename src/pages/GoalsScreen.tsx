import { useEffect, useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useGoals, useUpdateGoalStatus, useDeleteGoal, usePermanentlyDeleteGoal, useReopenGoal } from '@/hooks/useGoals';
import { useSubscription } from '@/hooks/useSubscription';
import { useToast } from '@/hooks/use-toast';
import { Target, Plus, TrendingUp, CheckCircle, Archive, Crown, Lock } from 'lucide-react';
import { GoalCard } from '@/components/goals/GoalCard';
import MobileGoalFilters, { GoalFilters } from '@/components/goals/MobileGoalFilters';
import { SmartArchivedGoalsSection } from '@/components/goals/SmartArchivedGoalsSection';
import { UpgradePrompt } from '@/components/paywall/UpgradePrompt';
import GoalsHeader from '@/components/goals/GoalsHeader';
import ThemeToggle from '@/components/ThemeToggle';
import { BottomNav } from '@/components/BottomNav';
import { useMobileAnimations } from '@/hooks/useMobileAnimations';

const GoalsScreen = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  // BLAZING FAST: Direct table read - triggers handle all progress calculations
  const { data: goals, isLoading: goalsLoading } = useGoals();
  const subscription = useSubscription();
  const updateGoalStatus = useUpdateGoalStatus();
  const reopenGoal = useReopenGoal();
  const deleteGoal = useDeleteGoal();
  const permanentlyDeleteGoal = usePermanentlyDeleteGoal();
  const { useStaggeredEntrance } = useMobileAnimations();
  
  const [filters, setFilters] = useState<GoalFilters>({
    search: '',
    status: 'all',
    modality: 'all'
  });

  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);
  
  const { activeGoals, archivedGoals, filteredGoals, showingArchivedOnly, systemArchivedGoals, userArchivedGoals } = useMemo(() => {
    if (!goals) return { 
      activeGoals: [], 
      archivedGoals: [], 
      filteredGoals: [], 
      showingArchivedOnly: false, 
      systemArchivedGoals: [], 
      userArchivedGoals: [] 
    };
    
    const activeGoals = goals.filter(goal => goal.status !== 'archived');
    const archivedGoals = goals.filter(goal => goal.status === 'archived');
    const systemArchivedGoals = goals.filter(goal => goal.archive_status === 'system_archived');
    const userArchivedGoals = goals.filter(goal => goal.archive_status === 'user_archived');
    const showingArchivedOnly = filters.status === 'archived';
    
    // If specifically filtering for archived goals, show archived goals with filters applied
    if (showingArchivedOnly) {
      const filteredArchivedGoals = archivedGoals.filter(goal => {
        const matchesSearch = !filters.search || 
          goal.title.toLowerCase().includes(filters.search.toLowerCase()) ||
          goal.description?.toLowerCase().includes(filters.search.toLowerCase());
        
        const matchesModality = filters.modality === 'all' || goal.modality === filters.modality;
        
        return matchesSearch && matchesModality;
      });
      
      return { activeGoals, archivedGoals, filteredGoals: filteredArchivedGoals, showingArchivedOnly: true };
    }
    
    // Otherwise, filter active goals normally
    const filteredGoals = activeGoals.filter(goal => {
      const matchesSearch = !filters.search || 
        goal.title.toLowerCase().includes(filters.search.toLowerCase()) ||
        goal.description?.toLowerCase().includes(filters.search.toLowerCase());
      
      const matchesStatus = filters.status === 'all' || goal.status === filters.status;
      const matchesModality = filters.modality === 'all' || goal.modality === filters.modality;
      
      return matchesSearch && matchesStatus && matchesModality;
    });
    
    return { activeGoals, archivedGoals, filteredGoals, showingArchivedOnly: false, systemArchivedGoals, userArchivedGoals };
  }, [goals, filters]);

  // Staggered entrance for goal cards
  const itemRefs = useStaggeredEntrance(filteredGoals.length, 100);
  
  // BLAZING FAST: Client-side stats calculation (no database aggregation queries needed)
  const stats = useMemo(() => {
    if (!goals) return { total: 0, active: 0, completed: 0, archived: 0 };
    
    return {
      total: goals.length,
      active: goals.filter(g => g.status === 'active').length,
      completed: goals.filter(g => g.status === 'completed').length,
      archived: goals.filter(g => g.status === 'archived').length,
    };
  }, [goals]);
  
  const handleStatusChange = (goalId: string, status: 'active' | 'archived' | 'completed') => {
    updateGoalStatus.mutate({ goalId, status });
  };

  const handleReopenGoal = (goalId: string) => {
    reopenGoal.mutate(goalId);
  };
  
  const handleNewGoal = () => {
    if (!subscription.canCreateGoals) {
      setShowUpgradePrompt(true);
      return;
    }
    navigate('/goals/new');
  };

  const handleDelete = (goalId: string) => {
    deleteGoal.mutate(goalId);
  };

  const handleUnarchive = (goalId: string) => {
    updateGoalStatus.mutate({ goalId, status: 'active' });
  };

  const handlePermanentDelete = (goalId: string) => {
    permanentlyDeleteGoal.mutate(goalId);
  };

  if (loading || goalsLoading || subscription.isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-4 pb-20">
          {/* Header Skeleton */}
          <div className="mb-6">
            <Skeleton className="h-48 rounded-2xl" />
          </div>
          
          {/* Filters Skeleton */}
          <div className="mb-6 space-y-4">
            <Skeleton className="h-12 rounded-xl" />
            <div className="flex gap-2">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-9 w-20 rounded-full" />
              ))}
            </div>
          </div>
          
          {/* Goals Skeleton */}
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Floating Action Button */}
      <div className="fixed top-4 right-4 z-50">
        <div className="flex items-center gap-2">
          <Button onClick={handleNewGoal} size="sm" className="rounded-full shadow-lg">
            <Plus className="mr-1 h-4 w-4" /> New Goal
          </Button>
          <ThemeToggle />
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto p-4 pb-20">
        {/* Goals Header with integrated stats */}
        <GoalsHeader 
          stats={stats} 
          hasSystemArchived={systemArchivedGoals.length > 0}
        />

          {/* System Archived Goals Upgrade Prompt */}
          {systemArchivedGoals.length > 0 && subscription.entitlement === 'free' && (
            <UpgradePrompt
              variant="banner"
              trigger="archive_limit"
              title="Goals Locked 🔒"
              description={`${systemArchivedGoals.length} goals were archived due to plan limits. Upgrade to Pro to unlock them instantly.`}
              className="mb-6"
            />
          )}

        {/* Goals List */}
        {goals && goals.length > 0 ? (
          <div className="space-y-6">
            <MobileGoalFilters
              filters={filters}
              onFiltersChange={setFilters}
              totalCount={showingArchivedOnly ? archivedGoals.length : activeGoals.length}
              filteredCount={filteredGoals.length}
            />
                
            {showingArchivedOnly ? (
              // Showing archived goals as main content when filtered
              filteredGoals.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 px-1">
                    <Archive className="h-5 w-5 text-muted-foreground" />
                    <h2 className="text-lg font-semibold text-muted-foreground">Archived Goals</h2>
                  </div>
                  <div className="space-y-4">
                    {filteredGoals.map((goal) => (
                      <GoalCard
                        key={goal.id}
                        goal={goal}
                        onStatusChange={handleStatusChange}
                        onReopenGoal={handleReopenGoal}
                        onDelete={handlePermanentDelete}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <Card className="rounded-2xl">
                  <CardContent className="p-8 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="p-3 bg-muted/50 rounded-full">
                        <Archive className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground mb-2">No archived goals match your filters</h3>
                        <p className="text-muted-foreground text-sm mb-4">
                          Try adjusting your search or filter criteria.
                        </p>
                        <Button variant="outline" onClick={() => setFilters({ search: '', status: 'all', modality: 'all' })} className="rounded-full">
                          Clear Filters
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            ) : (
              // Normal view showing active goals + archived section
              <>
                {filteredGoals.length > 0 ? (
                  <div className="space-y-4">
                    {filteredGoals.map((goal, index) => (
                      <div 
                        key={goal.id}
                        ref={(el) => itemRefs.current[index] = el}
                        className="card-entrance"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <GoalCard
                          goal={goal}
                          onStatusChange={handleStatusChange}
                          onReopenGoal={handleReopenGoal}
                          onDelete={handleDelete}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <Card className="rounded-2xl animate-fade-in">
                    <CardContent className="p-8 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="p-4 bg-gradient-to-br from-primary/10 to-accent/10 rounded-full">
                          <Target className="h-8 w-8 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground mb-2">No active goals match your filters</h3>
                          <p className="text-muted-foreground text-sm mb-4">
                            Try adjusting your search or filter criteria.
                          </p>
                          <Button variant="outline" onClick={() => setFilters({ search: '', status: 'all', modality: 'all' })} className="rounded-full">
                            Clear Filters
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                {/* Archived Goals Section - only show when not specifically filtering for archived */}
                <SmartArchivedGoalsSection
                  userArchivedGoals={userArchivedGoals}
                  systemArchivedGoals={systemArchivedGoals}
                  onUnarchive={handleUnarchive}
                  onPermanentDelete={handlePermanentDelete}
                />
              </>
            )}
          </div>
        ) : (
          <Card className="rounded-2xl animate-scale-in">
            <CardContent className="p-8 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 bg-gradient-to-br from-primary/10 to-accent/10 rounded-full">
                  <Target className="h-10 w-10 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">Ready to get started?</h3>
                  <p className="text-muted-foreground text-sm mb-6">
                    Create your first goal and start building momentum towards your dreams.
                  </p>
                  <div className="flex gap-2 justify-center mb-6">
                    <div className="px-3 py-1 bg-primary/10 rounded-full text-xs text-primary font-medium">
                      Set goals
                    </div>
                    <div className="px-3 py-1 bg-accent/10 rounded-full text-xs text-accent-foreground font-medium">
                      Track progress
                    </div>
                    <div className="px-3 py-1 bg-success/10 rounded-full text-xs text-success font-medium">
                      Achieve dreams
                    </div>
                  </div>
                  <Button onClick={handleNewGoal} size="lg" className="rounded-full">
                    <Plus className="mr-2 h-5 w-5" />
                    Create Your First Goal
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default GoalsScreen;