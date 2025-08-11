import React from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

  // Theme cycle order: light -> dark -> system -> light...
  const themeOrder: Theme[] = ['light', 'dark', 'system'];
  
  const themeConfig = {
    light: {
      icon: Sun,
      label: 'Light',
      nextTheme: 'dark' as Theme
    },
    dark: {
      icon: Moon,
      label: 'Dark', 
      nextTheme: 'system' as Theme
    },
    system: {
      icon: Monitor,
      label: 'System',
      nextTheme: 'light' as Theme
    }
  };

  const currentConfig = themeConfig[theme];
  const CurrentIcon = currentConfig.icon;

  const handleToggle = () => {
    const currentIndex = themeOrder.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themeOrder.length;
    const nextTheme = themeOrder[nextIndex];
    setTheme(nextTheme);
  };

  return (
    <Button 
      variant={variant} 
      size={size}
      onClick={handleToggle}
      className="relative transition-all duration-200 hover:scale-105 active:scale-95"
      aria-label={`Switch to ${currentConfig.nextTheme} theme`}
      title={`Current: ${currentConfig.label}. Click to switch to ${themeConfig[currentConfig.nextTheme].label}`}
    >
      <CurrentIcon className="h-4 w-4 transition-transform duration-200" />
      {showLabel && (
        <span className="ml-2 hidden sm:inline">
          {currentConfig.label}
        </span>
      )}
      
      {/* Visual indicator of actual theme */}
      <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-background transition-colors duration-200">
        <div 
          className={`w-full h-full rounded-full transition-colors duration-200 ${
            actualTheme === 'dark' 
              ? 'bg-slate-800' 
              : 'bg-yellow-400'
          }`}
        />
      </div>
    </Button>
  );
};

export default ThemeToggle;