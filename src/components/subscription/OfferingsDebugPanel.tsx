import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Purchases } from "@revenuecat/purchases-capacitor";
import { Loader2, Package, AlertTriangle, CheckCircle } from 'lucide-react';

export const OfferingsDebugPanel = () => {
  const [offerings, setOfferings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOfferings = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🔍 Fetching RevenueCat offerings...');
      const offeringsData = await Purchases.getOfferings();
      console.log('📦 Offerings fetched:', offeringsData);
      setOfferings(offeringsData);
    } catch (err: any) {
      console.error('❌ Failed to fetch offerings:', err);
      setError(err.message || 'Failed to fetch offerings');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Auto-fetch on mount
    fetchOfferings();
  }, []);

  const renderPackageDetails = (pkg: any) => (
    <div key={pkg.identifier} className="p-3 border rounded-lg space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">{pkg.product?.title || pkg.identifier}</h4>
        <Badge variant="outline">{pkg.product?.priceString || 'N/A'}</Badge>
      </div>
      <div className="text-sm text-muted-foreground space-y-1">
        <p><strong>ID:</strong> {pkg.identifier}</p>
        <p><strong>Product ID:</strong> {pkg.product?.identifier}</p>
        <p><strong>Type:</strong> {pkg.packageType}</p>
        <p><strong>Description:</strong> {pkg.product?.description || 'No description'}</p>
        {pkg.product?.subscriptionPeriod && (
          <p><strong>Period:</strong> {pkg.product.subscriptionPeriod}</p>
        )}
      </div>
    </div>
  );

  const renderOfferingDetails = (offering: any, isCurrentOffering: boolean) => (
    <div key={offering.identifier} className="space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="font-semibold">{offering.identifier}</h3>
        {isCurrentOffering && <Badge>Current</Badge>}
      </div>
      
      {offering.metadata && Object.keys(offering.metadata).length > 0 && (
        <div className="text-sm">
          <strong>Metadata:</strong>
          <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-auto">
            {JSON.stringify(offering.metadata, null, 2)}
          </pre>
        </div>
      )}

      <div className="space-y-2">
        <h4 className="font-medium">Available Packages ({offering.availablePackages?.length || 0})</h4>
        {offering.availablePackages?.length > 0 ? (
          <div className="space-y-2">
            {offering.availablePackages.map(renderPackageDetails)}
          </div>
        ) : (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              No packages configured for this offering
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          RevenueCat Offerings Debug Panel
        </CardTitle>
        <CardDescription>
          Debug and inspect your RevenueCat offerings and packages configuration
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Refresh Button */}
        <div className="flex items-center gap-3">
          <Button 
            onClick={fetchOfferings}
            disabled={isLoading}
            variant="outline"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Package className="h-4 w-4 mr-2" />
            )}
            Refresh Offerings
          </Button>
          
          {offerings && (
            <Badge variant="secondary">
              <CheckCircle className="h-3 w-3 mr-1" />
              Last fetched: {new Date().toLocaleTimeString()}
            </Badge>
          )}
        </div>

        {/* Error State */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Fetching offerings...</span>
          </div>
        )}

        {/* Offerings Data */}
        {offerings && !isLoading && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{Object.keys(offerings.all || {}).length}</div>
                <div className="text-sm text-muted-foreground">Total Offerings</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold">
                  {offerings.current?.availablePackages?.length || 0}
                </div>
                <div className="text-sm text-muted-foreground">Current Packages</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold">
                  {offerings.current ? 'YES' : 'NO'}
                </div>
                <div className="text-sm text-muted-foreground">Has Current Offering</div>
              </div>
            </div>

            {/* Current Offering */}
            {offerings.current ? (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Current Offering</h2>
                {renderOfferingDetails(offerings.current, true)}
              </div>
            ) : (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  No current offering configured. You need to set up offerings in RevenueCat Dashboard.
                </AlertDescription>
              </Alert>
            )}

            {/* All Offerings */}
            {offerings.all && Object.keys(offerings.all).length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">All Offerings</h2>
                <div className="space-y-6">
                  {Object.entries(offerings.all).map(([key, offering]: [string, any]) => (
                    <div key={key} className="border rounded-lg p-4">
                      {renderOfferingDetails(offering, key === offerings.current?.identifier)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Raw Data (for debugging) */}
            <details className="space-y-2">
              <summary className="cursor-pointer font-medium">Raw Offerings Data (Debug)</summary>
              <pre className="p-4 bg-muted rounded-lg text-xs overflow-auto max-h-96">
                {JSON.stringify(offerings, null, 2)}
              </pre>
            </details>
          </div>
        )}

        {/* Instructions */}
        {(!offerings || Object.keys(offerings.all || {}).length === 0) && !isLoading && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="space-y-2">
              <p><strong>No offerings found!</strong> You need to configure offerings in RevenueCat Dashboard:</p>
              <ol className="list-decimal list-inside space-y-1 text-xs mt-2">
                <li>Go to RevenueCat Dashboard → Products</li>
                <li>Create subscription products (e.g., "pro_monthly", "pro_yearly")</li>
                <li>Create an offering (e.g., "default") and add packages</li>
                <li>Make sure the offering is marked as current</li>
                <li>Refresh this panel to see the changes</li>
              </ol>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};