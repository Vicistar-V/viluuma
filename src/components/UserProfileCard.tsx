import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useUserData, useUpdateProfile, useDataCache } from '@/hooks/useUserData';
import { RefreshCw, Save, User, Calendar, Settings } from 'lucide-react';

const UserProfileCard = () => {
  const { data: userData, isLoading, error, refetch } = useUserData();
  const updateProfileMutation = useUpdateProfile();
  const { refreshUserData } = useDataCache();
  const { toast } = useToast();
  
  const [displayName, setDisplayName] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Update local state when data loads
  React.useEffect(() => {
    if (userData?.profile?.display_name) {
      setDisplayName(userData.profile.display_name);
    }
  }, [userData?.profile?.display_name]);

  const handleSave = async () => {
    if (!displayName.trim()) {
      toast({
        title: "Validation Error",
        description: "Display name cannot be empty",
        variant: "destructive"
      });
      return;
    }

    updateProfileMutation.mutate(
      { display_name: displayName.trim() },
      {
        onSuccess: () => {
          toast({
            title: "Profile Updated",
            description: "Your display name has been updated successfully"
          });
          setIsEditing(false);
        },
        onError: (error) => {
          toast({
            title: "Update Failed",
            description: error.message,
            variant: "destructive"
          });
        }
      }
    );
  };

  const handleRefresh = async () => {
    try {
      await refreshUserData();
      await refetch();
      toast({
        title: "Data Refreshed",
        description: "User data has been refreshed from the server"
      });
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh user data",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-destructive">Error Loading Profile</CardTitle>
          <CardDescription>{error.message}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const profile = userData?.profile;
  const stats = userData?.stats;
  const metadata = userData?.metadata;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <User className="h-5 w-5 text-primary" />
            <CardTitle>User Profile</CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            {metadata?.profile_exists === false && (
              <Badge variant="secondary">Profile Missing</Badge>
            )}
          </div>
        </div>
        <CardDescription>
          Manage your profile information and preferences
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Profile Info */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            {isEditing ? (
              <div className="flex space-x-2">
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your display name"
                />
                <Button
                  onClick={handleSave}
                  disabled={updateProfileMutation.isPending}
                  size="sm"
                >
                  <Save className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => {
                    setIsEditing(false);
                    setDisplayName(profile?.display_name || '');
                  }}
                  variant="outline"
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  {profile?.display_name || 'No display name set'}
                </p>
                <Button
                  onClick={() => setIsEditing(true)}
                  variant="outline"
                  size="sm"
                >
                  Edit
                </Button>
              </div>
            )}
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-1">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-xs text-muted-foreground">Account Age</Label>
                </div>
                <p className="text-sm font-medium">
                  {stats.account_age_days} days
                </p>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center space-x-1">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-xs text-muted-foreground">Last Updated</Label>
                </div>
                <p className="text-sm font-medium">
                  {new Date(stats.updated_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Cache Metadata */}
        {metadata && (
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Cache updated: {new Date(metadata.last_fetch).toLocaleTimeString()}</span>
              <Badge variant="outline" className="text-xs">
                Cached Data
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UserProfileCard;