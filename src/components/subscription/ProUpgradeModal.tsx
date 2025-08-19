import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useRevenueCat, useSubscription } from '@/hooks/useSubscription';
import { Purchases } from "@revenuecat/purchases-capacitor";
import { Crown, Star, Zap, Check, Loader2, AlertTriangle } from 'lucide-react';

interface ProUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  trigger?: 'goal_limit' | 'archive_limit' | 'premium_feature' | 'feature_request' | 'manual';
}

export const ProUpgradeModal = ({ isOpen, onClose, trigger = 'manual' }: ProUpgradeModalProps) => {
  const { isInitialized, purchasePro } = useRevenueCat();
  const subscription = useSubscription();
  const [availablePackages, setAvailablePackages] = useState<any[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [fetchingOfferings, setFetchingOfferings] = useState(false);
  const [offeringsError, setOfferingsError] = useState<string | null>(null);

  // Fetch available packages when modal opens
  useEffect(() => {
    const fetchOfferings = async () => {
      if (!isOpen || !isInitialized) return;

      setFetchingOfferings(true);
      setOfferingsError(null);

      try {
        console.log('🔍 Fetching offerings for purchase modal...');
        const offerings = await Purchases.getOfferings();
        
        if (offerings.current?.availablePackages?.length > 0) {
          setAvailablePackages(offerings.current.availablePackages);
          // Auto-select the first package (usually monthly)
          setSelectedPackage(offerings.current.availablePackages[0]);
          console.log('📦 Available packages:', offerings.current.availablePackages);
        } else {
          setOfferingsError('No subscription packages available. Please configure offerings in RevenueCat Dashboard.');
        }
      } catch (error: any) {
        console.error('❌ Failed to fetch offerings:', error);
        setOfferingsError(error.message || 'Failed to load subscription options');
      } finally {
        setFetchingOfferings(false);
      }
    };

    fetchOfferings();
  }, [isOpen, isInitialized]);

  const handlePurchase = async () => {
    if (!selectedPackage) return;

    try {
      await purchasePro.mutateAsync();
      onClose();
    } catch (error) {
      console.error('Purchase failed:', error);
    }
  };

  const getModalTitle = () => {
    switch (trigger) {
      case 'goal_limit':
        return 'Unlock Unlimited Goals';
      case 'archive_limit':
        return 'Reactivate Your Goals';
      case 'feature_request':
      case 'premium_feature':
        return 'Upgrade to Pro';
      default:
        return 'Upgrade to viluuma Pro';
    }
  };

  const getModalDescription = () => {
    switch (trigger) {
      case 'goal_limit':
        return 'You\'ve reached the free limit of 2 active goals. Upgrade to Pro for unlimited goals and premium features.';
      case 'archive_limit':
        return 'These goals were automatically archived. Upgrade to Pro to reactivate them and get unlimited goals.';
      case 'feature_request':
      case 'premium_feature':
        return 'This feature is available with a Pro subscription. Unlock all premium features today.';
      default:
        return 'Unlock the full potential of viluuma with unlimited goals and premium features.';
    }
  };

  const formatPrice = (pkg: any) => {
    if (pkg.product?.priceString) return pkg.product.priceString;
    if (pkg.product?.price && pkg.product?.currencyCode) {
      return `${pkg.product.currencyCode} ${pkg.product.price}`;
    }
    return 'Price unavailable';
  };

  const getPackageDescription = (pkg: any) => {
    const type = pkg.packageType?.toLowerCase() || '';
    if (type.includes('monthly')) return 'per month';
    if (type.includes('annual') || type.includes('yearly')) return 'per year';
    if (type.includes('weekly')) return 'per week';
    return pkg.product?.subscriptionPeriod || 'subscription';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            {getModalTitle()}
          </DialogTitle>
          <DialogDescription>
            {getModalDescription()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Pro Features */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Star className="h-4 w-4" />
              Pro Features
            </h3>
            <div className="grid gap-2">
              {[
                'Unlimited active goals',
                'Advanced goal templates',
                'Priority AI assistance',
                'Enhanced progress tracking',
                'Premium support'
              ].map((feature, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <Check className="h-3 w-3 text-green-500" />
                  {feature}
                </div>
              ))}
            </div>
          </div>

          {/* Current Status */}
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span>Current Plan:</span>
              <Badge variant={subscription.entitlement === 'pro' ? 'default' : 'outline'}>
                {subscription.entitlement?.toUpperCase() || 'FREE'}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm mt-1">
              <span>Active Goals:</span>
              <span>{subscription.activeGoalCount}/{subscription.maxGoals}</span>
            </div>
          </div>

          {/* Package Selection */}
          {fetchingOfferings ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2 text-sm">Loading subscription options...</span>
            </div>
          ) : offeringsError ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{offeringsError}</AlertDescription>
            </Alert>
          ) : availablePackages.length > 0 ? (
            <div className="space-y-3">
              <h3 className="font-semibold">Choose Your Plan</h3>
              <div className="space-y-2">
                {availablePackages.map((pkg) => (
                  <div
                    key={pkg.identifier}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedPackage?.identifier === pkg.identifier
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedPackage(pkg)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">
                          {pkg.product?.title || pkg.identifier}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {getPackageDescription(pkg)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{formatPrice(pkg)}</div>
                        {selectedPackage?.identifier === pkg.identifier && (
                          <Check className="h-4 w-4 text-primary ml-auto mt-1" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                No subscription plans available. Please check your RevenueCat configuration.
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Maybe Later
            </Button>
            <Button 
              onClick={handlePurchase}
              disabled={!selectedPackage || purchasePro.isPending || !isInitialized}
              className="flex-1"
            >
              {purchasePro.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Upgrade Now
                </>
              )}
            </Button>
          </div>

          {/* Footer */}
          <div className="text-xs text-muted-foreground text-center">
            Subscription will be charged to your app store account. Auto-renewal can be turned off in your account settings.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};