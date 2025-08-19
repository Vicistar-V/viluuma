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

// Track used IDs to prevent collisions
const usedIds = new Set<number>();

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
};