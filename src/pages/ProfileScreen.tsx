import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useUserStatus } from '@/hooks/useUserStatus';
import { useToast } from '@/hooks/use-toast';
import { LogOut, User, Settings, Camera, Bell, Target, Crown, Calendar, Zap, Lock, ArrowRight } from 'lucide-react';
import UserProfileCard from '@/components/UserProfileCard';
import ThemeToggle from '@/components/ThemeToggle';
import { BottomNav } from '@/components/BottomNav';

const ProfileScreen = () => {
  const { user, signOut, loading } = useAuth();
  const { subscriptionStatus, trialDaysLeft, canCreateGoal } = useUserStatus();
  const navigate = useNavigate();
  const { toast } = useToast();

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

  const getSubscriptionStatusBadge = () => {
    switch (subscriptionStatus) {
      case 'trial':
        return <Badge className="bg-primary text-primary-foreground">Trial Active</Badge>;
      case 'active':
        return <Badge className="bg-green-500 text-white">Pro Member</Badge>;
      case 'free':
        return <Badge variant="secondary">Free Plan</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getSubscriptionDescription = () => {
    switch (subscriptionStatus) {
      case 'trial':
        return `${trialDaysLeft} days remaining in your Pro trial`;
      case 'active':
        return 'Full access to all Pro features';
      case 'free':
        return 'Limited to 2 active goals';
      default:
        return 'Status unknown';
    }
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
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <User className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold">Profile</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* User Profile Card */}
          <UserProfileCard />

          {/* Subscription Status */}
          <Card className={subscriptionStatus === 'trial' ? 'border-primary bg-gradient-to-r from-primary/5 to-transparent' : ''}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {subscriptionStatus === 'active' || subscriptionStatus === 'trial' ? (
                    <Crown className="h-5 w-5 text-primary" />
                  ) : (
                    <Lock className="h-5 w-5 text-muted-foreground" />
                  )}
                  <CardTitle>Subscription Status</CardTitle>
                </div>
                {getSubscriptionStatusBadge()}
              </div>
              <CardDescription>
                {getSubscriptionDescription()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {subscriptionStatus === 'free' && (
                <div className="space-y-4">
                  <div className="p-4 bg-gradient-to-r from-primary/10 to-transparent rounded-lg border border-primary/20">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">Upgrade to Pro</h4>
                      <Zap className="w-5 h-5 text-primary" />
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Unlock unlimited goals, AI planning, and advanced features
                    </p>
                    <Button asChild className="w-full">
                      <Link to="/upgrade">
                        <Crown className="w-4 h-4 mr-2" />
                        Upgrade Now
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Link>
                    </Button>
                  </div>
                </div>
              )}

              {subscriptionStatus === 'trial' && (
                <div className="space-y-4">
                  <div className="p-4 bg-gradient-to-r from-orange-50 to-transparent rounded-lg border border-orange-200">
                    <div className="flex items-center space-x-2 mb-2">
                      <Calendar className="w-4 h-4 text-orange-600" />
                      <h4 className="font-medium text-orange-900">Trial Ending Soon</h4>
                    </div>
                    <p className="text-sm text-orange-700 mb-3">
                      Don't lose access to your Pro features. Upgrade before your trial expires.
                    </p>
                    <Button asChild variant="outline" className="w-full border-orange-200 text-orange-700 hover:bg-orange-50">
                      <Link to="/upgrade">
                        Secure Your Pro Access
                      </Link>
                    </Button>
                  </div>
                </div>
              )}

              {subscriptionStatus === 'active' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Plan:</span>
                    <span className="font-medium">Viluuma Pro</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Goals limit:</span>
                    <span className="font-medium text-green-600">Unlimited</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">AI Features:</span>
                    <span className="font-medium text-green-600">Full Access</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Account Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Settings className="h-5 w-5 text-primary" />
                <CardTitle>Account Settings</CardTitle>
              </div>
              <CardDescription>
                Manage your account preferences and settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Bell className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Notifications</p>
                      <p className="text-xs text-muted-foreground">Manage push notifications</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Configure
                  </Button>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Camera className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Avatar</p>
                      <p className="text-xs text-muted-foreground">Update profile picture</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Upload
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Info */}
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>
                Your account details and statistics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  <strong>Email:</strong> {user.email}
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>User ID:</strong> {user.id}
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Account created:</strong>{' '}
                  {new Date(user.created_at).toLocaleDateString()}
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Email verified:</strong>{' '}
                  {user.email_confirmed_at ? 'Yes' : 'No'}
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Goal creation:</strong>{' '}
                  {canCreateGoal ? 'Available' : 'Upgrade required'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Sign Out */}
          <Card>
            <CardContent className="p-6">
              <Button 
                variant="destructive" 
                onClick={handleSignOut}
                className="w-full"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default ProfileScreen;