import { useEffect, useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useUserStatus } from '@/hooks/useUserStatus';
import { useGoals, useUpdateGoalStatus, useDeleteGoal } from '@/hooks/useGoals';
import { useToast } from '@/hooks/use-toast';
import { Target, Plus, TrendingUp, CheckCircle, Archive } from 'lucide-react';
import { GoalCard } from '@/components/goals/GoalCard';
import { GoalFiltersComponent, GoalFilters } from '@/components/goals/GoalFilters';
import { CoachTipBanner } from '@/components/monetization/CoachTipBanner';
import { ArchivedGoalsSection } from '@/components/monetization/ArchivedGoalsSection';
import ThemeToggle from '@/components/ThemeToggle';
import { BottomNav } from '@/components/BottomNav';

const GoalsScreen = () => {
  const { user, loading } = useAuth();
  const { subscriptionStatus, canCreateGoal } = useUserStatus();
  const navigate = useNavigate();
  // BLAZING FAST: Direct table read - triggers handle all progress calculations
  const { data: goals, isLoading: goalsLoading } = useGoals();
  const updateGoalStatus = useUpdateGoalStatus();
  const deleteGoal = useDeleteGoal();
  
  const [filters, setFilters] = useState<GoalFilters>({
    search: '',
    status: 'all',
    modality: 'all'
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  // Separate active and archived goals
  const { activeGoals, archivedGoals } = useMemo(() => {
    if (!goals) return { activeGoals: [], archivedGoals: [] };
    
    const active = goals.filter(goal => !goal.is_archived);
    const archived = goals.filter(goal => goal.is_archived);
    
    return { activeGoals: active, archivedGoals: archived };
  }, [goals]);
  
  const filteredGoals = useMemo(() => {
    return activeGoals.filter(goal => {
      const matchesSearch = !filters.search || 
        goal.title.toLowerCase().includes(filters.search.toLowerCase()) ||
        goal.description?.toLowerCase().includes(filters.search.toLowerCase());
      
      const matchesStatus = filters.status === 'all' || goal.status === filters.status;
      const matchesModality = filters.modality === 'all' || goal.modality === filters.modality;
      
      return matchesSearch && matchesStatus && matchesModality;
    });
  }, [activeGoals, filters]);
  
  // BLAZING FAST: Client-side stats calculation (no database aggregation queries needed)
  const stats = useMemo(() => {
    if (!goals) return { total: 0, active: 0, completed: 0, archived: 0 };
    
    return {
      total: activeGoals.length,
      active: activeGoals.filter(g => g.status === 'active').length,
      completed: activeGoals.filter(g => g.status === 'completed').length,
      archived: archivedGoals.length,
    };
  }, [activeGoals, archivedGoals]);
  
  const handleStatusChange = (goalId: string, status: 'active' | 'archived' | 'completed') => {
    updateGoalStatus.mutate({ goalId, status });
  };
  
  const handleDelete = (goalId: string) => {
    deleteGoal.mutate(goalId);
  };

  if (loading || goalsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Target className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-semibold">Goals</h1>
            </div>
            <div className="flex items-center gap-2">
            <Button asChild size="sm" disabled={!canCreateGoal}>
              <Link to="/goals/new"><span className="inline-flex items-center"><Plus className="mr-1 h-4 w-4" /> New Goal</span></Link>
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
            <Button asChild size="sm" disabled={!canCreateGoal}>
              <Link to="/goals/new"><span className="inline-flex items-center"><Plus className="mr-1 h-4 w-4" /> New Goal</span></Link>
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <CoachTipBanner />
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
          {activeGoals && activeGoals.length > 0 ? (
            <div className="space-y-6">
              <GoalFiltersComponent
                filters={filters}
                onFiltersChange={setFilters}
                totalCount={activeGoals.length}
                filteredCount={filteredGoals.length}
              />
              
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
                    <h3 className="text-lg font-semibold mb-2">No goals match your filters</h3>
                    <p className="text-muted-foreground mb-4">
                      Try adjusting your search or filter criteria.
                    </p>
                    <Button variant="outline" onClick={() => setFilters({ search: '', status: 'all', modality: 'all' })}>
                      Clear Filters
                    </Button>
                  </CardContent>
                </Card>
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
                <Button asChild size="lg" disabled={!canCreateGoal}>
                  <Link to="/goals/new">
                    <Plus className="mr-2 h-5 w-5" />
                    Create Your First Goal
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          <ArchivedGoalsSection archivedGoals={archivedGoals} />
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default GoalsScreen;