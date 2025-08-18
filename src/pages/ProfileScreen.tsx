import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { LogOut, User, Settings, Camera, Bell, Target, Trash2, AlertTriangle } from 'lucide-react';
import UserProfileCard from '@/components/UserProfileCard';
import ThemeToggle from '@/components/ThemeToggle';
import { BottomNav } from '@/components/BottomNav';
import { DeleteAccountModal } from '@/components/account/DeleteAccountModal';
import { NotificationPermissionManager } from '@/components/notifications/NotificationPermissionManager';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';

const ProfileScreen = () => {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

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

          {/* Notification Management */}
          <div className="grid gap-6 md:grid-cols-2">
            <NotificationPermissionManager />
            <NotificationCenter />
          </div>

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

                <Separator className="my-4" />

                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <LogOut className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Sign Out</p>
                      <p className="text-xs text-muted-foreground">Sign out of your account</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleSignOut}>
                    Sign Out
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
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-destructive/20">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
              </div>
              <CardDescription>
                Irreversible and destructive actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 border border-destructive/20 rounded-lg bg-destructive/5">
                <div>
                  <p className="text-sm font-medium text-foreground">Delete Account</p>
                  <p className="text-xs text-muted-foreground">
                    Permanently delete your account and all data. This cannot be undone.
                  </p>
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
            </CardContent>
          </Card>
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