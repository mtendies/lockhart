import { getItem, setItem, removeItem } from './storageHelper';
import { syncCheckins } from './lib/simpleSync';

const STORAGE_KEY = 'health-advisor-checkins';
const REMINDER_KEY = 'health-advisor-checkin-reminder';
const DRAFT_KEY = 'health-advisor-checkin-draft';

export function getCheckIns() {
  try {
    const raw = getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    // Backwards compatibility: handle both array and wrapper object formats
    return Array.isArray(data) ? data : (data?.checkIns || []);
  } catch {
    return [];
  }
}

/**
 * Save check-ins to storage and sync to Supabase
 * Wraps checkIns array with updatedAt for sync conflict resolution
 */
function saveCheckIns(checkIns) {
  // CRITICAL: Wrap with updatedAt for sync conflict resolution
  const dataWithTimestamp = {
    checkIns,
    updatedAt: new Date().toISOString(),
  };
  setItem(STORAGE_KEY, JSON.stringify(dataWithTimestamp));
  syncCheckins();
}

// Get the Monday of the PREVIOUS week
// FIX #10: Uses local timezone for date calculation
function getPreviousWeekStart() {
  const d = new Date();
  const day = d.getDay();
  // Go to this week's Monday, then subtract 7 days
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) - 7;
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return getLocalDateString(d);
}

// Check if it's Sunday (or early in the week after) and the user hasn't completed their check-in
export function shouldShowSundayReminder() {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.

  let checkInMissing = false;

  if (dayOfWeek === 0) {
    // Sunday: Check if current week's check-in is done
    const currentWeekCheckIn = getCurrentWeekCheckIn();
    checkInMissing = !currentWeekCheckIn;
  } else if (dayOfWeek >= 1 && dayOfWeek <= 3) {
    // Monday-Wednesday: Grace period - check if LAST week's check-in is done
    const lastWeekStart = getPreviousWeekStart();
    const lastWeekCheckIn = getCheckInForWeek(lastWeekStart);
    checkInMissing = !lastWeekCheckIn;
  } else {
    // Thursday-Saturday: No check-in prompt (wait for Sunday)
    return false;
  }

  if (!checkInMissing) return false;

  // Check if user skipped check-in for this week
  const reminderData = getReminderData();
  const currentWeek = getWeekStart(new Date());
  if (reminderData?.weekOf === currentWeek && reminderData?.skippedForWeek) {
    return false; // Skipped for this week
  }

  // Check if user dismissed the reminder recently
  if (reminderData?.dismissedUntil) {
    const dismissedUntil = new Date(reminderData.dismissedUntil);
    if (today < dismissedUntil) return false; // Still dismissed
  }

  return true;
}

// Get reminder state from localStorage
function getReminderData() {
  try {
    const raw = getItem(REMINDER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Dismiss the reminder for a few hours
export function dismissReminderTemporarily(hours = 3) {
  const existing = getReminderData() || {};
  const currentWeek = getWeekStart(new Date());

  // Reset count if it's a new week
  const dismissCount = existing.weekOf === currentWeek
    ? (existing.dismissCount || 0) + 1
    : 1;

  const dismissedUntil = new Date();
  dismissedUntil.setHours(dismissedUntil.getHours() + hours);

  setItem(REMINDER_KEY, JSON.stringify({
    dismissedUntil: dismissedUntil.toISOString(),
    weekOf: currentWeek,
    dismissCount,
  }));
}

// Get the dismiss count for current week
export function getDismissCount() {
  const data = getReminderData();
  const currentWeek = getWeekStart(new Date());
  if (data?.weekOf === currentWeek) {
    return data.dismissCount || 0;
  }
  return 0;
}

// Skip check-in for this entire week
export function skipThisWeek() {
  const currentWeek = getWeekStart(new Date());
  setItem(REMINDER_KEY, JSON.stringify({
    weekOf: currentWeek,
    skippedForWeek: true,
  }));
}

// Check if check-in is skipped for this week
export function isSkippedForWeek() {
  const data = getReminderData();
  const currentWeek = getWeekStart(new Date());
  return data?.weekOf === currentWeek && data?.skippedForWeek === true;
}

// Clear reminder state (e.g., when a new week starts)
export function clearReminderState() {
  removeItem(REMINDER_KEY);
}

export function addCheckIn(checkIn) {
  const checkIns = getCheckIns();
  const entry = {
    ...checkIn,
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    date: new Date().toISOString(),
    weekOf: getWeekStart(new Date()),
  };
  checkIns.push(entry);
  saveCheckIns(checkIns);

  return checkIns;
}

export function getLatestCheckIn() {
  const checkIns = getCheckIns();
  if (checkIns.length === 0) return null;
  return checkIns.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
}

export function getCheckInForWeek(weekStart) {
  const checkIns = getCheckIns();
  return checkIns.find(c => c.weekOf === weekStart);
}

export function getCurrentWeekCheckIn() {
  const weekStart = getWeekStart(new Date());
  return getCheckInForWeek(weekStart);
}

export function getRecentCheckIns(count = 8) {
  const checkIns = getCheckIns();
  return checkIns
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, count);
}

/**
 * FIX #10: Get local date string (YYYY-MM-DD) in user's timezone
 * Avoids timezone bugs where UTC date differs from local date
 */
function getLocalDateString(date) {
  const d = date instanceof Date ? date : new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Get the Monday of the week for a given date
// FIX #10: Uses local timezone for date calculation
function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return getLocalDateString(d);
}

export function formatWeekOf(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// Draft management for incomplete check-ins
export function saveDraft(draftData) {
  try {
    const draft = {
      ...draftData,
      savedAt: new Date().toISOString(),
      weekOf: getWeekStart(new Date()),
    };
    setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch (err) {
    console.error('Error saving draft:', err);
  }
}

export function getDraft() {
  try {
    const raw = getItem(DRAFT_KEY);
    if (!raw) return null;

    const draft = JSON.parse(raw);
    // Only return draft if it's for the current week
    const currentWeek = getWeekStart(new Date());
    if (draft.weekOf === currentWeek) {
      return draft;
    }
    // Clear stale draft from previous week
    clearDraft();
    return null;
  } catch {
    return null;
  }
}

export function clearDraft() {
  removeItem(DRAFT_KEY);
}

// Clear current week's check-in for testing
export function clearCurrentWeekCheckIn() {
  const checkIns = getCheckIns();
  const currentWeek = getWeekStart(new Date());

  // Filter out current week's check-in
  const filteredCheckIns = checkIns.filter(c => c.weekOf !== currentWeek);
  saveCheckIns(filteredCheckIns);

  // Also clear draft and reminder state
  clearDraft();
  clearReminderState();

  return true;
}
