/**
 * Browser Notification utilities for check-in reminders
 */

import { getItem, setItem } from '../storageHelper';

const NOTIFICATION_SETTINGS_KEY = 'health-advisor-notification-settings';
const DEFAULT_REMINDER_TIME = '20:00'; // 8 PM default

/**
 * Get notification settings
 */
export function getNotificationSettings() {
  try {
    const raw = getItem(NOTIFICATION_SETTINGS_KEY);
    return raw ? JSON.parse(raw) : {
      checkInReminders: false,
      reminderTime: DEFAULT_REMINDER_TIME,
    };
  } catch {
    return {
      checkInReminders: false,
      reminderTime: DEFAULT_REMINDER_TIME,
    };
  }
}

/**
 * Save notification settings
 */
export function saveNotificationSettings(settings) {
  setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings));
}

/**
 * Check if notifications are supported
 */
export function isNotificationSupported() {
  return 'Notification' in window;
}

/**
 * Get current notification permission status
 */
export function getNotificationPermission() {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission; // 'default', 'granted', 'denied'
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission() {
  if (!isNotificationSupported()) {
    return { success: false, reason: 'unsupported' };
  }

  if (Notification.permission === 'granted') {
    return { success: true };
  }

  if (Notification.permission === 'denied') {
    return { success: false, reason: 'denied' };
  }

  try {
    const permission = await Notification.requestPermission();
    return { success: permission === 'granted', reason: permission };
  } catch (err) {
    return { success: false, reason: 'error' };
  }
}

/**
 * Show a notification
 */
export function showNotification(title, options = {}) {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return null;
  }

  return new Notification(title, {
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    ...options,
  });
}

/**
 * Schedule daily check-in reminder
 * Called on app load if notifications are enabled
 */
let reminderTimeout = null;

export function scheduleCheckInReminder() {
  const settings = getNotificationSettings();

  if (!settings.checkInReminders || Notification.permission !== 'granted') {
    return;
  }

  // Clear any existing timeout
  if (reminderTimeout) {
    clearTimeout(reminderTimeout);
  }

  // Calculate time until reminder
  const [hours, minutes] = settings.reminderTime.split(':').map(Number);
  const now = new Date();
  const reminderTime = new Date();
  reminderTime.setHours(hours, minutes, 0, 0);

  // If time has passed today, schedule for tomorrow
  if (reminderTime <= now) {
    reminderTime.setDate(reminderTime.getDate() + 1);
  }

  const msUntilReminder = reminderTime - now;

  reminderTimeout = setTimeout(() => {
    showNotification('Time for your daily check-in!', {
      body: 'Take a moment to log your progress and reflect on your day.',
      tag: 'check-in-reminder',
    });

    // Reschedule for tomorrow
    scheduleCheckInReminder();
  }, msUntilReminder);

  console.log(`[Notifications] Check-in reminder scheduled for ${reminderTime.toLocaleString()}`);
}

/**
 * Cancel scheduled reminder
 */
export function cancelCheckInReminder() {
  if (reminderTimeout) {
    clearTimeout(reminderTimeout);
    reminderTimeout = null;
  }
}

/**
 * Toggle check-in reminders
 */
export async function toggleCheckInReminders(enabled) {
  const settings = getNotificationSettings();

  if (enabled) {
    const permission = await requestNotificationPermission();

    if (!permission.success) {
      return {
        success: false,
        reason: permission.reason,
        message: permission.reason === 'denied'
          ? 'Notifications blocked. Please enable them in your browser settings.'
          : 'Unable to enable notifications.',
      };
    }

    settings.checkInReminders = true;
    saveNotificationSettings(settings);
    scheduleCheckInReminder();

    return { success: true, message: 'Check-in reminders enabled!' };
  } else {
    settings.checkInReminders = false;
    saveNotificationSettings(settings);
    cancelCheckInReminder();

    return { success: true, message: 'Check-in reminders disabled.' };
  }
}

/**
 * Initialize notifications on app load
 */
export function initializeNotifications() {
  const settings = getNotificationSettings();

  if (settings.checkInReminders && Notification.permission === 'granted') {
    scheduleCheckInReminder();
  }
}
