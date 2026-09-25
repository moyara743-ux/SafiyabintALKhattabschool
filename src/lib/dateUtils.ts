/**
 * Date utility functions for School Information & Media System
 * Dynamically computes real current date, today, and tomorrow based on the client/system time.
 */

// Format a Date object to YYYY-MM-DD string
export function formatDateToISO(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Get today's real date as YYYY-MM-DD
export function getTodayDateString(): string {
  return formatDateToISO(new Date());
}

// Get tomorrow's real date as YYYY-MM-DD
export function getTomorrowDateString(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return formatDateToISO(tomorrow);
}

// Check if a given date string (YYYY-MM-DD or ISO) is Today
export function isTodayDate(dateString: string): boolean {
  if (!dateString) return false;
  const target = dateString.split('T')[0];
  return target === getTodayDateString();
}

// Check if a given date string is Tomorrow
export function isTomorrowDate(dateString: string): boolean {
  if (!dateString) return false;
  const target = dateString.split('T')[0];
  return target === getTomorrowDateString();
}

// Check if a date string is active within a range [start, end]
export function isDateWithinRange(todayStr: string, startDate?: string, endDate?: string): boolean {
  if (startDate && startDate > todayStr) return false;
  if (endDate && endDate < todayStr) return false;
  return true;
}

// Format date to friendly Arabic string (e.g. "الأربعاء، 23 سبتمبر 2026")
export function formatArabicFullDate(dateInput: string | Date = new Date()): string {
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput.includes('T') ? dateInput : `${dateInput}T00:00:00`) : dateInput;
    if (isNaN(d.getTime())) return String(dateInput);
    return new Intl.DateTimeFormat('ar-SA-u-ca-gregory', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(d);
  } catch {
    return String(dateInput);
  }
}

// Short Arabic Date (e.g. "23 سبتمبر")
export function formatArabicShortDate(dateInput: string | Date): string {
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput.includes('T') ? dateInput : `${dateInput}T00:00:00`) : dateInput;
    if (isNaN(d.getTime())) return String(dateInput);
    return new Intl.DateTimeFormat('ar-SA-u-ca-gregory', {
      month: 'short',
      day: 'numeric',
    }).format(d);
  } catch {
    return String(dateInput);
  }
}

// Get dynamic relative badge text (اليوم / غداً / أمس / التاريخ)
export function getRelativeDayBadge(dateString: string): { label: string; isToday: boolean; isTomorrow: boolean } {
  if (!dateString) return { label: '', isToday: false, isTomorrow: false };
  const dStr = dateString.split('T')[0];
  const todayStr = getTodayDateString();
  const tomorrowStr = getTomorrowDateString();

  if (dStr === todayStr) {
    return { label: 'اليوم', isToday: true, isTomorrow: false };
  }
  if (dStr === tomorrowStr) {
    return { label: 'غداً', isToday: false, isTomorrow: true };
  }
  return { label: formatArabicShortDate(dStr), isToday: false, isTomorrow: false };
}
