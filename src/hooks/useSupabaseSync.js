/**
 * useSupabaseSync - Hook for syncing data between localStorage and Supabase
 *
 * On mount (when authenticated):
 * - Loads all user data from Supabase
 * - Populates localStorage stores as cache
 *
 * Provides sync functions for real-time updates
 */

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import * as dataService from '../lib/dataService';
import { getItem, setItem } from '../storageHelper';

// Storage keys that map to Supabase tables
const SYNC_KEYS = {
  profile: 'health-advisor-profile',
  activities: 'health-advisor-activities',
  playbook: 'health-advisor-playbook',
  chats: 'health-advisor-chats',
  insights: 'health-advisor-learned-insights',
  checkins: 'health-advisor-checkins',
  nutrition: 'health-advisor-nutrition-calibration',
  notes: 'health-advisor-notes',
};

export function useSupabaseSync() {
  const { user, isAuthenticated } = useAuth();
  const [syncStatus, setSyncStatus] = useState('idle'); // idle | syncing | synced | error
  const [lastSynced, setLastSynced] = useState(null);
  const [syncErrors, setSyncErrors] = useState([]);

  // Load all data from Supabase into localStorage
  const loadFromSupabase = useCallback(async () => {
    if (!user?.id) return;

    setSyncStatus('syncing');
    setSyncErrors([]);

    try {
      const results = await dataService.loadAllData(user.id);

      // Store profile
      if (results.profile) {
        setItem(SYNC_KEYS.profile, JSON.stringify(results.profile));
      }

      // Store activities
      if (results.activities?.length > 0) {
        // Transform to match localStorage format
        const activities = results.activities.map(a => ({
          ...a,
          date: a.timestamp?.split('T')[0],
          weekOf: getWeekOf(a.timestamp),
        }));
        setItem(SYNC_KEYS.activities, JSON.stringify(activities));
      }

      // Store playbook
      if (results.playbook) {
        setItem(SYNC_KEYS.playbook, JSON.stringify(results.playbook));
      }

      // Store conversations
      if (results.conversations?.length > 0) {
        setItem(SYNC_KEYS.chats, JSON.stringify(results.conversations));
      }

      // Store insights
      if (results.insights?.length > 0) {
        setItem(SYNC_KEYS.insights, JSON.stringify(results.insights));
      }

      // Store check-ins
      if (results.checkins?.length > 0) {
        setItem(SYNC_KEYS.checkins, JSON.stringify(results.checkins));
      }

      // Store nutrition calibration
      if (results.nutritionCalibration) {
        setItem(SYNC_KEYS.nutrition, JSON.stringify(results.nutritionCalibration));
      }

      // Store notes
      if (results.notes && Object.keys(results.notes).length > 0) {
        setItem(SYNC_KEYS.notes, JSON.stringify(results.notes));
      }

      if (results.errors?.length > 0) {
        setSyncErrors(results.errors);
        setSyncStatus('error');
      } else {
        setSyncStatus('synced');
        setLastSynced(new Date());
      }

      return results;
    } catch (err) {
      console.error('Supabase sync error:', err);
      setSyncErrors([{ type: 'general', error: err }]);
      setSyncStatus('error');
      return null;
    }
  }, [user?.id]);

  // Push all localStorage data to Supabase
  const pushToSupabase = useCallback(async () => {
    if (!user?.id) return;

    setSyncStatus('syncing');
    const errors = [];

    try {
      // Sync profile
      const profileData = getItem(SYNC_KEYS.profile);
      if (profileData) {
        const profile = JSON.parse(profileData);
        const { error } = await dataService.upsertProfile(user.id, profile);
        if (error) errors.push({ type: 'profile', error });
      }

      // Sync activities
      const activitiesData = getItem(SYNC_KEYS.activities);
      if (activitiesData) {
        const activities = JSON.parse(activitiesData);
        for (const activity of activities) {
          const { error } = await dataService.addActivity(user.id, activity);
          if (error && error.code !== '23505') { // Ignore duplicate key errors
            errors.push({ type: 'activity', error });
          }
        }
      }

      // Sync playbook
      const playbookData = getItem(SYNC_KEYS.playbook);
      if (playbookData) {
        const playbook = JSON.parse(playbookData);
        const { error } = await dataService.upsertPlaybook(user.id, playbook);
        if (error) errors.push({ type: 'playbook', error });
      }

      // Sync conversations
      const chatsData = getItem(SYNC_KEYS.chats);
      if (chatsData) {
        const chats = JSON.parse(chatsData);
        for (const chat of chats) {
          const { error } = await dataService.upsertConversation(user.id, chat);
          if (error) errors.push({ type: 'conversation', error });
        }
      }

      // Sync insights
      const insightsData = getItem(SYNC_KEYS.insights);
      if (insightsData) {
        const insights = JSON.parse(insightsData);
        for (const insight of insights) {
          const { error } = await dataService.addLearnedInsight(user.id, {
            text: insight.text || insight.insight,
            category: insight.category,
            confidence: insight.confidence,
          });
          if (error && error.code !== '23505') {
            errors.push({ type: 'insight', error });
          }
        }
      }

      // Sync check-ins
      const checkinsData = getItem(SYNC_KEYS.checkins);
      if (checkinsData) {
        const checkins = JSON.parse(checkinsData);
        for (const checkin of checkins) {
          const { error } = await dataService.upsertCheckin(user.id, checkin);
          if (error) errors.push({ type: 'checkin', error });
        }
      }

      if (errors.length > 0) {
        setSyncErrors(errors);
        setSyncStatus('error');
      } else {
        setSyncStatus('synced');
        setLastSynced(new Date());
      }

      return { errors };
    } catch (err) {
      console.error('Push to Supabase error:', err);
      setSyncErrors([{ type: 'general', error: err }]);
      setSyncStatus('error');
      return { errors: [{ type: 'general', error: err }] };
    }
  }, [user?.id]);

  // Sync specific data type to Supabase
  const syncToSupabase = useCallback(async (type, data) => {
    if (!user?.id) return { error: 'Not authenticated' };

    try {
      switch (type) {
        case 'profile':
          return await dataService.upsertProfile(user.id, data);
        case 'activity':
          return await dataService.addActivity(user.id, data);
        case 'playbook':
          return await dataService.upsertPlaybook(user.id, data);
        case 'conversation':
          return await dataService.upsertConversation(user.id, data);
        case 'insight':
          return await dataService.addLearnedInsight(user.id, data);
        case 'checkin':
          return await dataService.upsertCheckin(user.id, data);
        case 'nutritionDay':
          return await dataService.upsertNutritionDay(user.id, data.date, data.meals, data.complete);
        default:
          return { error: `Unknown sync type: ${type}` };
      }
    } catch (err) {
      console.error(`Sync ${type} error:`, err);
      return { error: err };
    }
  }, [user?.id]);

  // Auto-load from Supabase when authenticated
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      // Check if we should load from Supabase
      // Only load if localStorage is empty or on first auth
      const lastSync = localStorage.getItem('health-advisor-last-supabase-sync');
      const hasLocalData = getItem(SYNC_KEYS.profile);

      // If no local data, always load from Supabase
      // If has local data but hasn't synced in 24 hours, load from Supabase
      const shouldSync = !hasLocalData ||
        !lastSync ||
        (Date.now() - parseInt(lastSync)) > 24 * 60 * 60 * 1000;

      if (shouldSync) {
        loadFromSupabase().then(() => {
          localStorage.setItem('health-advisor-last-supabase-sync', Date.now().toString());
        });
      }
    }
  }, [isAuthenticated, user?.id, loadFromSupabase]);

  return {
    syncStatus,
    lastSynced,
    syncErrors,
    loadFromSupabase,
    pushToSupabase,
    syncToSupabase,
    isAuthenticated,
    userId: user?.id,
  };
}

// Helper to calculate week of
function getWeekOf(dateStr) {
  const date = new Date(dateStr);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split('T')[0];
}

export default useSupabaseSync;
