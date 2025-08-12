import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

const TodayLoadingSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Skeleton */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <Skeleton className="h-8 w-64 mb-1" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-4 w-48" />
      </div>

      {/* Task Skeletons */}
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index} className="border-l-4 border-l-muted animate-pulse">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Skeleton className="w-5 h-5 rounded mt-1" />
                <div className="flex-1">
                  <div className="flex gap-2 mb-2">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-12 rounded-full" />
                  </div>
                  <Skeleton className="h-5 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {/* Special checklist task skeleton */}
        <Card className="border-dashed border-2 animate-pulse">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Skeleton className="w-5 h-5 rounded mt-1" />
              <div className="flex-1">
                <Skeleton className="h-4 w-32 mb-2" />
                <div className="flex gap-2 mb-2">
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
                <Skeleton className="h-4 w-2/3 mb-2" />
                <div className="flex justify-between items-center">
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overdue Accordion Skeleton */}
      <Card className="border border-muted">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Skeleton className="w-4 h-4" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-8 rounded-full ml-2" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TodayLoadingSkeleton;