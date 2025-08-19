export interface NotificationPreferences {
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

const DEFAULT_PREFERENCES: NotificationPreferences = {
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
};

export const loadNotificationPreferences = (): NotificationPreferences => {
  try {
    const saved = localStorage.getItem('notification-preferences');
    if (saved) {
      return { ...DEFAULT_PREFERENCES, ...JSON.parse(saved) };
    }
  } catch (error) {
    console.error('Error loading notification preferences:', error);
  }
  return DEFAULT_PREFERENCES;
};

export const saveNotificationPreferences = (preferences: NotificationPreferences): void => {
  try {
    localStorage.setItem('notification-preferences', JSON.stringify(preferences));
  } catch (error) {
    console.error('Error saving notification preferences:', error);
  }
};

export const isWithinQuietHours = (preferences: NotificationPreferences, time: Date = new Date()): boolean => {
  if (!preferences.quietHours.enabled) return false;

  const currentHour = time.getHours();
  const currentMinute = time.getMinutes();
  const currentTimeMinutes = currentHour * 60 + currentMinute;

  const [startHour, startMinute] = preferences.quietHours.start.split(':').map(Number);
  const [endHour, endMinute] = preferences.quietHours.end.split(':').map(Number);
  
  const startTimeMinutes = startHour * 60 + startMinute;
  const endTimeMinutes = endHour * 60 + endMinute;

  // Handle quiet hours that span midnight
  if (startTimeMinutes > endTimeMinutes) {
    return currentTimeMinutes >= startTimeMinutes || currentTimeMinutes <= endTimeMinutes;
  } else {
    return currentTimeMinutes >= startTimeMinutes && currentTimeMinutes <= endTimeMinutes;
  }
};

export const getPreferredDigestTime = (preferences: NotificationPreferences): { hour: number; minute: number } => {
  const [hour, minute] = preferences.digestTime.split(':').map(Number);
  return { hour, minute };
};

export const shouldShowNotification = (
  preferences: NotificationPreferences, 
  notificationType: keyof Pick<NotificationPreferences, 'dailyDigest' | 'coachingNudges' | 'deadlineWarnings' | 'momentumBoosters'>,
  targetTime?: Date
): boolean => {
  return preferences[notificationType] && !isWithinQuietHours(preferences, targetTime);
};