import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSubscription, useRevenueCat } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Shield, Zap, Crown, Package } from 'lucide-react';
import { OfferingsDebugPanel } from './OfferingsDebugPanel';

export const RevenueCatTestPanel = () => {
  const { user } = useAuth();
  const subscription = useSubscription();
  const { isInitialized, purchasePro, syncSubscription, restorePurchases, isLoading } = useRevenueCat();

  const handleTestPurchase = async () => {
    try {
      await purchasePro.mutateAsync();
    } catch (error) {
      console.error('Test purchase error:', error);
    }
  };

  const handleSyncTest = async () => {
    try {
      await syncSubscription.mutateAsync();
    } catch (error) {
      console.error('Sync test error:', error);
    }
  };

  const handleRestoreTest = async () => {
    try {
      await restorePurchases.mutateAsync();
    } catch (error) {
      console.error('Restore test error:', error);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            RevenueCat Integration Test Panel
          </CardTitle>
          <CardDescription>
            Test and debug RevenueCat functionality in development
          </CardDescription>
        </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Section */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <h3 className="font-semibold">RevenueCat Status</h3>
            <Badge variant={isInitialized ? 'default' : 'secondary'}>
              {isInitialized ? 'Initialized' : 'Not Initialized'}
            </Badge>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">Subscription Status</h3>
            <Badge variant={subscription.entitlement === 'pro' ? 'default' : 'outline'}>
              <Crown className="h-3 w-3 mr-1" />
              {subscription.entitlement?.toUpperCase()}
            </Badge>
          </div>
        </div>

        {/* User Info */}
        <div className="space-y-2">
          <h3 className="font-semibold">User Information</h3>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>User ID: {user?.id || 'Not logged in'}</p>
            <p>Active Goals: {subscription.activeGoalCount}/{subscription.maxGoals}</p>
            <p>Can Create Goals: {subscription.canCreateGoals ? 'Yes' : 'No'}</p>
          </div>
        </div>

        {/* Test Actions */}
        <div className="space-y-3">
          <h3 className="font-semibold">Test Actions</h3>
          
          <div className="grid grid-cols-1 gap-3">
            <Button 
              onClick={handleSyncTest}
              disabled={!isInitialized || isLoading}
              variant="outline"
              className="justify-start"
            >
              {syncSubscription.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              Test Sync Subscription
            </Button>

            <Button 
              onClick={handleTestPurchase}
              disabled={!isInitialized || isLoading}
              variant="outline"
              className="justify-start"
            >
              {purchasePro.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Crown className="h-4 w-4 mr-2" />
              )}
              Test Purchase Pro
            </Button>

            <Button 
              onClick={handleRestoreTest}
              disabled={!isInitialized || isLoading}
              variant="outline"
              className="justify-start"
            >
              {restorePurchases.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Shield className="h-4 w-4 mr-2" />
              )}
              Test Restore Purchases
            </Button>
          </div>
        </div>

        {/* Status Messages */}
        {subscription.isLoading && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm">Loading subscription status...</p>
          </div>
        )}

        {!isInitialized && user && (
          <div className="p-3 bg-destructive/10 rounded-lg">
            <p className="text-sm text-destructive">
              RevenueCat not initialized. Check console for API key errors.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
    
    {/* Offerings Debug Panel */}
    <OfferingsDebugPanel />
  </div>
  );
};