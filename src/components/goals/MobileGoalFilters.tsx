import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Search, 
  Filter, 
  X, 
  Target, 
  CheckCircle, 
  Archive,
  TrendingUp,
  List,
  CheckSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface GoalFilters {
  search: string;
  status: 'all' | 'active' | 'completed' | 'archived';
  modality: 'all' | 'project' | 'checklist';
}

interface MobileGoalFiltersProps {
  filters: GoalFilters;
  onFiltersChange: (filters: GoalFilters) => void;
  totalCount: number;
  filteredCount: number;
}

export const MobileGoalFilters: React.FC<MobileGoalFiltersProps> = ({ 
  filters, 
  onFiltersChange, 
  totalCount, 
  filteredCount 
}) => {
  const [showFilters, setShowFilters] = useState(false);
  const hasActiveFilters = filters.search || filters.status !== 'all' || filters.modality !== 'all';
  
  const clearFilters = () => {
    onFiltersChange({
      search: '',
      status: 'all',
      modality: 'all'
    });
  };

  const statusOptions = [
    { value: 'all', label: 'All Status', icon: Target, color: 'default' },
    { value: 'active', label: 'Active', icon: TrendingUp, color: 'blue' },
    { value: 'completed', label: 'Completed', icon: CheckCircle, color: 'success' },
    { value: 'archived', label: 'Archived', icon: Archive, color: 'muted' },
  ];

  const modalityOptions = [
    { value: 'all', label: 'All Types', icon: List, color: 'default' },
    { value: 'project', label: 'Projects', icon: Target, color: 'primary' },
    { value: 'checklist', label: 'Checklists', icon: CheckSquare, color: 'secondary' },
  ];

  const handleStatusChange = (status: GoalFilters['status']) => {
    onFiltersChange({ ...filters, status });
  };

  const handleModalityChange = (modality: GoalFilters['modality']) => {
    onFiltersChange({ ...filters, modality });
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search goals..."
          value={filters.search}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          className="pl-9 h-12 rounded-xl bg-background border-muted-foreground/20 focus:border-primary/40 transition-colors"
        />
      </div>

      {/* Quick Filter Buttons */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <Button
          variant={showFilters ? "default" : "outline"}
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="flex-shrink-0 h-9 rounded-full"
        >
          <Filter className="w-4 h-4 mr-2" />
          Filters
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 rounded-full">
              {[filters.status !== 'all', filters.modality !== 'all', !!filters.search].filter(Boolean).length}
            </Badge>
          )}
        </Button>

        {/* Quick Status Filters */}
        {statusOptions.slice(1).map((status) => (
          <Button
            key={status.value}
            variant={filters.status === status.value ? "default" : "outline"}
            size="sm"
            onClick={() => handleStatusChange(status.value as GoalFilters['status'])}
            className={cn(
              "flex-shrink-0 h-9 rounded-full",
              filters.status === status.value && status.color === 'blue' && "bg-blue-500 hover:bg-blue-600",
              filters.status === status.value && status.color === 'success' && "bg-success hover:bg-success/90",
              filters.status === status.value && status.color === 'muted' && "bg-muted-foreground hover:bg-muted-foreground/90"
            )}
          >
            <status.icon className="w-4 h-4 mr-1" />
            {status.label}
          </Button>
        ))}

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="flex-shrink-0 h-9 rounded-full text-muted-foreground"
          >
            <X className="w-4 h-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Expanded Filters */}
      {showFilters && (
        <Card className="animate-fade-in">
          <CardContent className="p-4 space-y-4">
            {/* Status Filter */}
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-3 uppercase tracking-wide">Status</h4>
              <div className="grid grid-cols-2 gap-2">
                {statusOptions.map((status) => (
                  <Button
                    key={status.value}
                    variant={filters.status === status.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleStatusChange(status.value as GoalFilters['status'])}
                    className={cn(
                      "justify-start h-10 rounded-xl",
                      filters.status === status.value && status.color === 'blue' && "bg-blue-500 hover:bg-blue-600 text-white",
                      filters.status === status.value && status.color === 'success' && "bg-success hover:bg-success/90 text-white",
                      filters.status === status.value && status.color === 'muted' && "bg-muted-foreground hover:bg-muted-foreground/90 text-white"
                    )}
                  >
                    <status.icon className="w-4 h-4 mr-2" />
                    {status.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Modality Filter */}
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-3 uppercase tracking-wide">Type</h4>
              <div className="grid grid-cols-1 gap-2">
                {modalityOptions.map((modality) => (
                  <Button
                    key={modality.value}
                    variant={filters.modality === modality.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleModalityChange(modality.value as GoalFilters['modality'])}
                    className="justify-start h-10 rounded-xl"
                  >
                    <modality.icon className="w-4 h-4 mr-2" />
                    {modality.label}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Count */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Filter className="w-3 h-3" />
              <span>Filtered</span>
            </div>
          )}
        </div>
        <div className="text-muted-foreground font-medium">
          {hasActiveFilters ? (
            <span>
              <span className="text-foreground font-semibold">{filteredCount}</span> of {totalCount} goals
            </span>
          ) : (
            <span>
              <span className="text-foreground font-semibold">{totalCount}</span> goals
            </span>
          )}
        </div>
      </div>
    </div>
  );
};