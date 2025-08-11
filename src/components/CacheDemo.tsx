import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useProfileSummary, usePrefetchUserData, useDataCache } from '@/hooks/useUserData';
import { Database, RefreshCw, Trash2, Eye } from 'lucide-react';

const CacheDemo = () => {
  const { data: profileSummary, isLoading, refetch, dataUpdatedAt } = useProfileSummary();
  const { prefetchUserData } = usePrefetchUserData();
  const { clearUserCache, refreshUserData, getCachedUserData } = useDataCache();
  const { toast } = useToast();

  const handlePrefetch = async () => {
    try {
      await prefetchUserData();
      toast({
        title: "Data Prefetched",
        description: "User data has been prefetched and cached"
      });
    } catch (error) {
      toast({
        title: "Prefetch Failed",
        description: "Failed to prefetch user data",
        variant: "destructive"
      });
    }
  };

  const handleClearCache = () => {
    clearUserCache();
    toast({
      title: "Cache Cleared",
      description: "All cached user data has been cleared"
    });
  };

  const handleRefreshCache = async () => {
    try {
      await refreshUserData();
      toast({
        title: "Cache Refreshed",
        description: "Cache has been invalidated and data refreshed"
      });
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh cached data",
        variant: "destructive"
      });
    }
  };

  const handleViewCached = () => {
    const cachedData = getCachedUserData();
    console.log('Cached User Data:', cachedData);
    toast({
      title: "Cached Data",
      description: cachedData ? "Check console for cached data" : "No cached data found"
    });
  };

  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt) : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Database className="h-5 w-5 text-primary" />
          <CardTitle>Cache Management Demo</CardTitle>
        </div>
        <CardDescription>
          Test atomic RPC functions and frontend caching
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Cache Status */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="space-y-1">
            <p className="text-sm font-medium">Profile Summary Cache</p>
            <p className="text-xs text-muted-foreground">
              {lastUpdated 
                ? `Last updated: ${lastUpdated.toLocaleTimeString()}` 
                : 'No data cached'
              }
            </p>
          </div>
          <Badge variant={isLoading ? "secondary" : "default"}>
            {isLoading ? "Loading" : "Cached"}
          </Badge>
        </div>

        {/* Cache Data Preview */}
        {profileSummary && (
          <div className="p-3 bg-background border rounded-lg">
            <p className="text-xs font-medium text-muted-foreground mb-2">Cached Profile Summary:</p>
            <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
              {JSON.stringify(profileSummary, null, 2)}
            </pre>
          </div>
        )}

        {/* Cache Controls */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrefetch}
            className="h-10"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Prefetch
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshCache}
            className="h-10"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleViewCached}
            className="h-10"
          >
            <Eye className="h-4 w-4 mr-2" />
            View Cache
          </Button>
          
          <Button
            variant="destructive"
            size="sm"
            onClick={handleClearCache}
            className="h-10"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear
          </Button>
        </div>

        {/* Performance Info */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• RPC functions fetch data atomically in single DB round-trip</p>
          <p>• React Query caches with 5min stale time for optimal performance</p>
          <p>• Cache automatically invalidates on mutations</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default CacheDemo;