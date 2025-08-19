import { useEffect, useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useGoals, useUpdateGoalStatus, useDeleteGoal, usePermanentlyDeleteGoal } from '@/hooks/useGoals';
import { useSubscription } from '@/hooks/useSubscription';
import { useToast } from '@/hooks/use-toast';
import { Target, Plus, TrendingUp, CheckCircle, Archive, Crown, Lock } from 'lucide-react';
import { GoalCard } from '@/components/goals/GoalCard';
import { GoalFiltersComponent, GoalFilters } from '@/components/goals/GoalFilters';
import { ArchivedGoalsSection } from '@/components/goals/ArchivedGoalsSection';
import { UpgradePrompt } from '@/components/paywall/UpgradePrompt';
import ThemeToggle from '@/components/ThemeToggle';
import { BottomNav } from '@/components/BottomNav';

const GoalsScreen = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  // BLAZING FAST: Direct table read - triggers handle all progress calculations
  const { data: goals, isLoading: goalsLoading } = useGoals();
  const subscription = useSubscription();
  const updateGoalStatus = useUpdateGoalStatus();
  const deleteGoal = useDeleteGoal();
  const permanentlyDeleteGoal = usePermanentlyDeleteGoal();
  
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
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Target className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-semibold">Goals</h1>
            </div>
            <div className="flex items-center gap-2">
            <Button onClick={handleNewGoal} size="sm">
              <Plus className="mr-1 h-4 w-4" /> New Goal
            </Button>
              <ThemeToggle />
            </div>
          </div>
        </header>
        
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-24 rounded-lg" />
              ))}
            </div>
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-48 rounded-lg" />
              ))}
            </div>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Target className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold">Goals</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleNewGoal} size="sm">
              <Plus className="mr-1 h-4 w-4" /> New Goal
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Target className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">{stats.total}</p>
                    <p className="text-sm text-muted-foreground">Total Goals</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold">{stats.active}</p>
                    <p className="text-sm text-muted-foreground">Active</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold">{stats.completed}</p>
                    <p className="text-sm text-muted-foreground">Completed</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Archive className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-2xl font-bold">{stats.archived}</p>
                    <p className="text-sm text-muted-foreground">Archived</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Goals List */}
          {goals && goals.length > 0 ? (
            <div className="space-y-6">
                <GoalFiltersComponent
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
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {filteredGoals.map((goal) => (
                          <GoalCard
                            key={goal.id}
                            goal={goal}
                            onStatusChange={handleStatusChange}
                            onDelete={handlePermanentDelete}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="p-8 text-center">
                        <Archive className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No archived goals match your filters</h3>
                        <p className="text-muted-foreground mb-4">
                          Try adjusting your search or filter criteria.
                        </p>
                        <Button variant="outline" onClick={() => setFilters({ search: '', status: 'all', modality: 'all' })}>
                          Clear Filters
                        </Button>
                      </CardContent>
                    </Card>
                  )
                ) : (
                  // Normal view showing active goals + archived section
                  <>
                    {filteredGoals.length > 0 ? (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {filteredGoals.map((goal) => (
                          <GoalCard
                            key={goal.id}
                            goal={goal}
                            onStatusChange={handleStatusChange}
                            onDelete={handleDelete}
                          />
                        ))}
                      </div>
                    ) : (
                      <Card>
                        <CardContent className="p-8 text-center">
                          <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <h3 className="text-lg font-semibold mb-2">No active goals match your filters</h3>
                          <p className="text-muted-foreground mb-4">
                            Try adjusting your search or filter criteria.
                          </p>
                          <Button variant="outline" onClick={() => setFilters({ search: '', status: 'all', modality: 'all' })}>
                            Clear Filters
                          </Button>
                        </CardContent>
                      </Card>
                    )}
                    
                    {/* Archived Goals Section - only show when not specifically filtering for archived */}
                    <ArchivedGoalsSection
                      archivedGoals={archivedGoals}
                      onUnarchive={handleUnarchive}
                      onPermanentDelete={handlePermanentDelete}
                    />
                  </>
                )}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Target className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No goals yet</h3>
                <p className="text-muted-foreground mb-6">
                  Start your journey by creating your first goal. Set milestones, track progress, and achieve your dreams.
                </p>
                <Button onClick={handleNewGoal} size="lg">
                  <Plus className="mr-2 h-5 w-5" />
                  Create Your First Goal
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default GoalsScreen;