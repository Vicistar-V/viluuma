import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useUserData } from '@/hooks/useUserData';
import { useToast } from '@/hooks/use-toast';
import { useSubscription } from '@/hooks/useSubscription';
import { LogOut, User, Settings, Camera, Bell, Target, Trash2, AlertTriangle, Crown, Bug, CreditCard, Calendar, Shield, Activity, TrendingUp } from 'lucide-react';
import UserProfileCard from '@/components/UserProfileCard';
import ThemeToggle from '@/components/ThemeToggle';
import { BottomNav } from '@/components/BottomNav';
import { DeleteAccountModal } from '@/components/account/DeleteAccountModal';
import { NotificationPermissionManager } from '@/components/notifications/NotificationPermissionManager';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { SubscriptionStatusIndicator } from '@/components/subscription/SubscriptionStatusIndicator';
import { cn } from '@/lib/utils';


const ProfileScreen = () => {
  const navigate = useNavigate();
  const { user, signOut, loading } = useAuth();
  const { data: userData } = useUserData();
  const { toast } = useToast();
  const subscription = useSubscription();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  const today = new Date();
  const formattedDate = format(today, 'EEEE, MMMM d');
  
  const firstName = userData?.profile?.display_name?.split(' ')[0] || 
                   user?.user_metadata?.display_name?.split(' ')[0] || 
                   'there';

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Signed out",
      description: "You have been successfully signed out"
    });
    navigate('/login');
  };

  const handleDeleteAccountSuccess = () => {
    setIsDeleteModalOpen(false);
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="max-w-2xl mx-auto">
          {/* Premium Header Section */}
          <div className="mb-6 animate-fade-in">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-background to-muted/20 p-6 shadow-sm">
              {/* Theme Toggle - Top Right */}
              <div className="absolute top-4 right-4">
                <ThemeToggle />
              </div>
              
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
                  Profile Dashboard
                </h1>
                <p className="text-lg text-muted-foreground">
                  Welcome back, {firstName}
                </p>
              </div>
              
              {/* Account Stats Grid */}
              {!subscription.isLoading && (
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-4 h-4 text-primary" />
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Active Goals</span>
                    </div>
                    <p className="text-2xl font-bold text-foreground">{subscription.activeGoalCount}</p>
                  </div>
                  
                  <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-blue-500" />
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Goal Limit</span>
                    </div>
                    <p className="text-2xl font-bold text-foreground">
                      {subscription.maxGoals === Infinity ? '∞' : subscription.maxGoals}
                    </p>
                  </div>
                  
                  <div className="p-4 rounded-xl bg-gradient-to-br from-success/10 to-success/5 border border-success/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-4 h-4 text-success" />
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <SubscriptionStatusIndicator variant="badge" />
                    </div>
                  </div>
                  
                  <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="w-4 h-4 text-amber-500" />
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Account</span>
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      {new Date(user.created_at).getFullYear()}
                    </p>
                  </div>
                </div>
              )}
              
              {/* Account Status Card */}
              <div className={cn(
                "relative p-4 rounded-xl border transition-all duration-300",
                subscription.canCreateGoals 
                  ? "bg-gradient-to-br from-success/10 to-success/5 border-success/20"
                  : "bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20"
              )}>
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-full",
                    subscription.canCreateGoals ? "bg-success/20" : "bg-warning/20"
                  )}>
                    <Crown className={cn(
                      "w-5 h-5",
                      subscription.canCreateGoals ? "text-success" : "text-warning"
                    )} />
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-1">
                      {subscription.canCreateGoals ? "Account Active" : "Goal Limit Reached"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {subscription.canCreateGoals 
                        ? "You can create new goals and access all features" 
                        : "Upgrade to create more goals"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* User Profile Card */}
            <UserProfileCard />

            {/* Notification Management */}
            <div className="grid gap-6 md:grid-cols-2">
              <NotificationPermissionManager />
              <NotificationCenter />
            </div>

            {/* Account Settings */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-card to-muted/10 p-6 shadow-sm border">
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Settings className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-semibold text-foreground">Account Settings</h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  Manage your account preferences and settings
                </p>
              </div>

              <div className="grid gap-3">
                <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/20">
                        <Bell className="h-4 w-4 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Notification System</p>
                        <p className="text-xs text-muted-foreground">Advanced debugging & monitoring</p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate('/notifications')}
                    >
                      Debug Dashboard
                    </Button>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-500/20">
                        <Bug className="h-4 w-4 text-amber-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">RevenueCat Integration</p>
                        <p className="text-xs text-muted-foreground">Test subscription & purchase flows</p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate('/revenuecat-test')}
                    >
                      Test Panel
                    </Button>
                  </div>
                </div>
                
                <div className="p-4 rounded-xl bg-gradient-to-br from-success/10 to-success/5 border border-success/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-success/20">
                        <Camera className="h-4 w-4 text-success" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Avatar</p>
                        <p className="text-xs text-muted-foreground">Update profile picture</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      Upload
                    </Button>
                  </div>
                </div>

                <Separator className="my-2" />

                <div className="p-4 rounded-xl bg-gradient-to-br from-muted/20 to-muted/5 border border-muted/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted/30">
                        <LogOut className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Sign Out</p>
                        <p className="text-xs text-muted-foreground">Sign out of your account</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleSignOut}>
                      Sign Out
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Account Information */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-card to-muted/10 p-6 shadow-sm border">
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-semibold text-foreground">Account Information</h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  Your account details and statistics
                </p>
              </div>

              <div className="grid gap-3">
                <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-muted-foreground">Email</p>
                    <p className="text-sm font-semibold text-foreground">{user.email}</p>
                  </div>
                </div>
                
                <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-muted-foreground">Account Created</p>
                    <p className="text-sm font-semibold text-foreground">
                      {new Date(user.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <div className="p-4 rounded-xl bg-gradient-to-br from-success/10 to-success/5 border border-success/20">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-muted-foreground">Email Verified</p>
                    <Badge variant={user.email_confirmed_at ? 'default' : 'secondary'}>
                      {user.email_confirmed_at ? 'Verified' : 'Pending'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-destructive/5 to-destructive/10 p-6 shadow-sm border border-destructive/20">
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <h2 className="text-xl font-semibold text-destructive">Danger Zone</h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  Irreversible and destructive actions
                </p>
              </div>

              <div className="p-4 rounded-xl bg-gradient-to-br from-destructive/10 to-destructive/5 border border-destructive/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-destructive/20">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Delete Account</p>
                      <p className="text-xs text-muted-foreground">
                        Permanently delete your account and all data. This cannot be undone.
                      </p>
                    </div>
                  </div>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={() => setIsDeleteModalOpen(true)}
                    className="ml-4"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Account
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Delete Account Modal */}
      <DeleteAccountModal
        isOpen={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        onSuccess={handleDeleteAccountSuccess}
      />

      <BottomNav />
    </div>
  );
};

export default ProfileScreen;