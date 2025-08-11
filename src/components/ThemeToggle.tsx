import React from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTheme, type Theme } from '@/contexts/ThemeContext';

interface ThemeToggleProps {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showLabel?: boolean;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ 
  variant = 'ghost', 
  size = 'icon',
  showLabel = false 
}) => {
  const { theme, setTheme, actualTheme } = useTheme();

  const themeOptions: Array<{
    value: Theme;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    description: string;
  }> = [
    {
      value: 'light',
      label: 'Light',
      icon: Sun,
      description: 'Light theme'
    },
    {
      value: 'dark',
      label: 'Dark',
      icon: Moon,
      description: 'Dark theme'
    },
    {
      value: 'system',
      label: 'System',
      icon: Monitor,
      description: 'Follow system preference'
    }
  ];

  const currentThemeOption = themeOptions.find(option => option.value === theme);
  const CurrentIcon = currentThemeOption?.icon || Monitor;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant={variant} 
          size={size}
          className="relative"
          aria-label="Toggle theme"
        >
          <CurrentIcon className="h-4 w-4" />
          {showLabel && (
            <span className="ml-2 hidden sm:inline">
              {currentThemeOption?.label}
            </span>
          )}
          
          {/* Visual indicator of actual theme */}
          <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-background">
            <div 
              className={`w-full h-full rounded-full ${
                actualTheme === 'dark' 
                  ? 'bg-slate-800' 
                  : 'bg-yellow-400'
              }`}
            />
          </div>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-48">
        {themeOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = theme === option.value;
          
          return (
            <DropdownMenuItem
              key={option.value}
              onClick={() => setTheme(option.value)}
              className={`flex items-center gap-2 cursor-pointer ${
                isSelected ? 'bg-accent text-accent-foreground' : ''
              }`}
            >
              <Icon className="h-4 w-4" />
              <div className="flex flex-col">
                <span className="text-sm font-medium">{option.label}</span>
                <span className="text-xs text-muted-foreground">
                  {option.description}
                </span>
              </div>
              {isSelected && (
                <div className="ml-auto w-2 h-2 rounded-full bg-primary" />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ThemeToggle;