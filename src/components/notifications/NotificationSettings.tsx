import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, Clock, MessageCircle, Target, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface NotificationPreferences {
  dailyDigest: boolean;
  digestTime: string;
  coachingNudges: boolean;
  deadlineWarnings: boolean;
  momentumBoosters: boolean;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

export const NotificationSettings = () => {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    dailyDigest: true,
    digestTime: '08:00',
    coachingNudges: true,
    deadlineWarnings: true,
    momentumBoosters: true,
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '07:00',
    },
  });
  const { toast } = useToast();

  // Load preferences from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('notification-preferences');
    if (saved) {
      try {
        setPreferences(JSON.parse(saved));
      } catch (error) {
        console.error('Error loading notification preferences:', error);
      }
    }
  }, []);

  const savePreferences = (newPreferences: NotificationPreferences) => {
    setPreferences(newPreferences);
    localStorage.setItem('notification-preferences', JSON.stringify(newPreferences));
    toast({
      title: "Settings saved",
      description: "Your notification preferences have been updated.",
    });
  };

  const handleToggle = (key: keyof NotificationPreferences, value: boolean) => {
    const newPreferences = { ...preferences, [key]: value };
    savePreferences(newPreferences);
  };

  const handleTimeChange = (key: keyof NotificationPreferences, value: string) => {
    const newPreferences = { ...preferences, [key]: value };
    savePreferences(newPreferences);
  };

  const handleQuietHoursToggle = (enabled: boolean) => {
    const newPreferences = {
      ...preferences,
      quietHours: { ...preferences.quietHours, enabled }
    };
    savePreferences(newPreferences);
  };

  const handleQuietHoursTime = (key: 'start' | 'end', value: string) => {
    const newPreferences = {
      ...preferences,
      quietHours: { ...preferences.quietHours, [key]: value }
    };
    savePreferences(newPreferences);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          <CardTitle>Notification Settings</CardTitle>
        </div>
        <CardDescription>
          Customize how and when you receive notifications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Daily Digest */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-primary" />
              <div>
                <Label htmlFor="daily-digest" className="text-sm font-medium">
                  Daily Digest
                </Label>
                <p className="text-xs text-muted-foreground">
                  Morning summary of your tasks
                </p>
              </div>
            </div>
            <Switch
              id="daily-digest"
              checked={preferences.dailyDigest}
              onCheckedChange={(value) => handleToggle('dailyDigest', value)}
            />
          </div>
          {preferences.dailyDigest && (
            <div className="ml-7 space-y-2">
              <Label className="text-xs text-muted-foreground">Delivery time</Label>
              <Select
                value={preferences.digestTime}
                onValueChange={(value) => handleTimeChange('digestTime', value)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="06:00">6:00 AM</SelectItem>
                  <SelectItem value="07:00">7:00 AM</SelectItem>
                  <SelectItem value="08:00">8:00 AM</SelectItem>
                  <SelectItem value="09:00">9:00 AM</SelectItem>
                  <SelectItem value="10:00">10:00 AM</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <Separator />

        {/* Coaching Nudges */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageCircle className="w-4 h-4 text-primary" />
            <div>
              <Label htmlFor="coaching-nudges" className="text-sm font-medium">
                Coaching Messages
              </Label>
              <p className="text-xs text-muted-foreground">
                Helpful nudges when you need motivation
              </p>
            </div>
          </div>
          <Switch
            id="coaching-nudges"
            checked={preferences.coachingNudges}
            onCheckedChange={(value) => handleToggle('coachingNudges', value)}
          />
        </div>

        {/* Deadline Warnings */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Target className="w-4 h-4 text-primary" />
            <div>
              <Label htmlFor="deadline-warnings" className="text-sm font-medium">
                Deadline Warnings
              </Label>
              <p className="text-xs text-muted-foreground">
                Reminders for upcoming deadlines
              </p>
            </div>
          </div>
          <Switch
            id="deadline-warnings"
            checked={preferences.deadlineWarnings}
            onCheckedChange={(value) => handleToggle('deadlineWarnings', value)}
          />
        </div>

        {/* Momentum Boosters */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap className="w-4 h-4 text-primary" />
            <div>
              <Label htmlFor="momentum-boosters" className="text-sm font-medium">
                Momentum Boosters
              </Label>
              <p className="text-xs text-muted-foreground">
                Celebrate your winning streaks
              </p>
            </div>
          </div>
          <Switch
            id="momentum-boosters"
            checked={preferences.momentumBoosters}
            onCheckedChange={(value) => handleToggle('momentumBoosters', value)}
          />
        </div>

        <Separator />

        {/* Quiet Hours */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="quiet-hours" className="text-sm font-medium">
                Do Not Disturb
              </Label>
              <p className="text-xs text-muted-foreground">
                Pause notifications during quiet hours
              </p>
            </div>
            <Switch
              id="quiet-hours"
              checked={preferences.quietHours.enabled}
              onCheckedChange={handleQuietHoursToggle}
            />
          </div>
          {preferences.quietHours.enabled && (
            <div className="space-y-3 pl-4 border-l-2 border-muted">
              <div className="flex items-center gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">From</Label>
                  <Select
                    value={preferences.quietHours.start}
                    onValueChange={(value) => handleQuietHoursTime('start', value)}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => {
                        const hour = i.toString().padStart(2, '0');
                        return (
                          <SelectItem key={hour} value={`${hour}:00`}>
                            {hour}:00
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">To</Label>
                  <Select
                    value={preferences.quietHours.end}
                    onValueChange={(value) => handleQuietHoursTime('end', value)}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => {
                        const hour = i.toString().padStart(2, '0');
                        return (
                          <SelectItem key={hour} value={`${hour}:00`}>
                            {hour}:00
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};