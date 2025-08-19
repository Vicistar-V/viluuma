/**
 * Centralized Notification ID Management System
 * Prevents ID collisions and provides organized ID ranges
 */

// Notification ID Ranges (no overlaps)
export const NotificationIdRanges = {
  DAILY_DIGEST: { start: 1, end: 99 },
  TASK_REMINDERS: { start: 100, end: 999 },
  COACHING_NUDGES: { start: 1000, end: 9999 },
  SYSTEM_TEST: { start: 999999, end: 999999 },
} as const;

// Track used IDs to prevent collisions - now persistent across app restarts
const STORAGE_KEY = 'notification-used-ids';

const loadUsedIds = (): Set<number> => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return new Set(JSON.parse(stored));
    }
  } catch (error) {
    console.warn('Failed to load used notification IDs:', error);
  }
  return new Set<number>();
};

const saveUsedIds = (usedIds: Set<number>): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...usedIds]));
  } catch (error) {
    console.warn('Failed to save used notification IDs:', error);
  }
};

let usedIds = loadUsedIds();

/**
 * Generate a unique ID within the specified range
 */
export const generateNotificationId = (type: keyof typeof NotificationIdRanges): number => {
  const range = NotificationIdRanges[type];
  
  // For single-instance notifications, return the fixed ID
  if (type === 'DAILY_DIGEST') return 1;
  if (type === 'SYSTEM_TEST') return 999999;
  
  // For dynamic notifications, find an unused ID in range
  for (let id = range.start; id <= range.end; id++) {
    if (!usedIds.has(id)) {
      usedIds.add(id);
      saveUsedIds(usedIds);
      return id;
    }
  }
  
  // Fallback: reuse from start of range (should rarely happen)
  console.warn(`No available IDs in range for ${type}, reusing from start`);
  return range.start;
};

/**
 * Mark an ID as available for reuse
 */
export const releaseNotificationId = (id: number): void => {
  usedIds.delete(id);
  saveUsedIds(usedIds);
};

/**
 * Get notification type from ID
 */
export const getNotificationTypeFromId = (id: number): string => {
  if (id >= NotificationIdRanges.DAILY_DIGEST.start && id <= NotificationIdRanges.DAILY_DIGEST.end) {
    return 'Daily Digest';
  }
  if (id >= NotificationIdRanges.TASK_REMINDERS.start && id <= NotificationIdRanges.TASK_REMINDERS.end) {
    return 'Task Reminder';
  }
  if (id >= NotificationIdRanges.COACHING_NUDGES.start && id <= NotificationIdRanges.COACHING_NUDGES.end) {
    return 'Coaching Nudge';
  }
  if (id === NotificationIdRanges.SYSTEM_TEST.start) {
    return 'System Test';
  }
  return 'Unknown';
};

/**
 * Clear all tracked IDs (useful for cleanup)
 */
export const clearAllNotificationIds = (): void => {
  usedIds.clear();
  saveUsedIds(usedIds);
};