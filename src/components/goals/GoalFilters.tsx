import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Filter, X } from 'lucide-react';

export interface GoalFilters {
  search: string;
  status: 'all' | 'active' | 'completed' | 'archived';
  modality: 'all' | 'project' | 'checklist';
}

interface GoalFiltersProps {
  filters: GoalFilters;
  onFiltersChange: (filters: GoalFilters) => void;
  totalCount: number;
  filteredCount: number;
}

export const GoalFiltersComponent = ({ 
  filters, 
  onFiltersChange, 
  totalCount, 
  filteredCount 
}: GoalFiltersProps) => {
  const hasActiveFilters = filters.search || filters.status !== 'all' || filters.modality !== 'all';
  
  const clearFilters = () => {
    onFiltersChange({
      search: '',
      status: 'all',
      modality: 'all'
    });
  };
  
  return (
    <div className="space-y-4">
      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search goals..."
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            className="pl-9"
          />
        </div>
        
        <div className="flex gap-2">
          <Select 
            value={filters.status} 
            onValueChange={(value: any) => onFiltersChange({ ...filters, status: value })}
          >
            <SelectTrigger className="w-[130px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          
          <Select 
            value={filters.modality} 
            onValueChange={(value: any) => onFiltersChange({ ...filters, modality: value })}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="project">Project</SelectItem>
              <SelectItem value="checklist">Checklist</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Active Filters and Results */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <>
              <span className="text-sm text-muted-foreground">Filters:</span>
              {filters.search && (
                <Badge variant="secondary">
                  Search: "{filters.search}"
                </Badge>
              )}
              {filters.status !== 'all' && (
                <Badge variant="secondary" className="capitalize">
                  {filters.status}
                </Badge>
              )}
              {filters.modality !== 'all' && (
                <Badge variant="secondary" className="capitalize">
                  {filters.modality}
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>
        
        <div className="text-sm text-muted-foreground">
          {hasActiveFilters ? `${filteredCount} of ${totalCount}` : `${totalCount}`} goals
        </div>
      </div>
    </div>
  );
};