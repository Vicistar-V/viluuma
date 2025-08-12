// Workday-aware date utilities for UTC-safe calculations
// Inclusive semantics: workday 1 from a workday is the same day; weekends are skipped.

export function isWeekendUTC(date: Date): boolean {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

export function addWorkdaysInclusiveUTC(start: Date, workdays: number): Date {
  // Normalize to UTC midnight to avoid timezone drift
  const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));

  // Advance to next workday if starting on weekend
  while (isWeekendUTC(d)) {
    d.setUTCDate(d.getUTCDate() + 1);
  }

  if (workdays <= 1) return d;

  let remaining = workdays - 1;
  while (remaining > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    if (!isWeekendUTC(d)) remaining--;
  }
  return d;
}
