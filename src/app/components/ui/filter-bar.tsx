import React from 'react';
import { Search, Plus } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

interface FilterBarProps {
  onSearch: (term: string) => void;
  searchPlaceholder?: string;
  onNew?: () => void;
  newLabel?: string;
  children?: React.ReactNode; // For additional filters (dropdowns)
  className?: string;
}

export function FilterBar({ 
  onSearch, 
  searchPlaceholder = "Search...", 
  onNew, 
  newLabel = "New",
  children,
  className 
}: FilterBarProps) {
  return (
    <div className={cn("flex flex-col sm:flex-row gap-4 justify-between items-center mb-6", className)}>
      <div className="flex flex-1 items-center gap-3 w-full sm:w-auto">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
          <Input 
            placeholder={searchPlaceholder} 
            onChange={(e) => onSearch(e.target.value)}
            className="pl-9 bg-white"
          />
        </div>
        {children}
      </div>
      
      {onNew && (
        <Button onClick={onNew} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          {newLabel}
        </Button>
      )}
    </div>
  );
}
