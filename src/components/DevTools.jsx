/**
 * DevTools Component
 * Quick access to test profiles and debugging tools.
 * Only visible in development mode.
 */

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Wrench,
  X,
  User,
  Download,
  Upload,
  Trash2,
  Eye,
  RefreshCw,
  Shield,
  FlaskConical,
  ChevronRight,
  Check,
  AlertTriangle,
  Star,
  BookOpen,
  Sparkles,
  Database,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import * as dataService from '../lib/dataService';
import {
  getProfiles,
  getActiveProfile,
  getActiveProfileId,
  loadTestProfile,
  switchProfile,
  exportProfileData,
  importProfileData,
  clearCurrentProfileData,
  deleteAllTestProfiles,
  getMainProfile,
  isTestProfile,
} from '../profileStore';
import { clearLearnedInsights, getInsightCount } from '../learnedInsightsStore';
import { clearCurrentWeekCheckIn, getCurrentWeekCheckIn, clearDraft, getDraft } from '../checkInStore';
import {
  getActivities,
  getActivitiesThisWeek,
  getWeekOf,
  getWeeklySummary,
  logActivity,
  ACTIVITY_TYPES,
  WORKOUT_TYPES,
} from '../activityLogStore';
import { getWorkouts, getWorkoutsThisWeek } from '../workoutStore';
import { getItem, setItem } from '../storageHelper';
import TEST_PROFILES from '../testProfiles';

// Show in development, or in production with ?devtools=true URL param
const isDev = import.meta.env.DEV;
const hasDevToolsParam = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('devtools') === 'true';
const canShowDevTools = isDev || hasDevToolsParam;

export default function DevTools({ isModal = false, onClose }) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(isModal); // If modal, start open
  const [activeTab, setActiveTab] = useState('profiles');
  const [loading, setLoading] = useState(null);
  const [notification, setNotification] = useState(null);
  const [showDataViewer, setShowDataViewer] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [importError, setImportError] = useState(null);
  const [activityDebugData, setActivityDebugData] = useState(null);
  const [showLegacyImport, setShowLegacyImport] = useState(false);
  const [legacyImportJson, setLegacyImportJson] = useState('');
  const [importProgress, setImportProgress] = useState(null);
  const fileInputRef = useRef(null);

  // Sync isOpen with isModal prop
  useEffect(() => {
    if (isModal) setIsOpen(true);
  }, [isModal]);

  // Keyboard shortcut: Ctrl+Shift+D (only for non-modal)
  useEffect(() => {
    if (isModal) return;
    function handleKeyDown(e) {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModal]);

  // Handle close for modal mode
  function handleClose() {
    setIsOpen(false);
    onClose?.();
  }

  // If opened as modal (from header menu), always show
  // If not modal (floating button), only show in dev or with ?devtools=true
  if (!isModal && !canShowDevTools) return null;

  function showNotification(message, type = 'success') {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  }

  async function handleLoadTestProfile(profileKey) {
    const testProfile = TEST_PROFILES[profileKey];
    if (!testProfile) return;

    setLoading(profileKey);

    try {
      // Load the test profile data
      const profile = loadTestProfile(testProfile);

      // Switch to the test profile
      switchProfile(profile.id);

      showNotification(`Loaded "${testProfile.name}" successfully!`);

      // Reload to apply changes
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (err) {
      console.error('Error loading test profile:', err);
      showNotification(`Error: ${err.message}`, 'error');
    } finally {
      setLoading(null);
    }
  }

  function handleSwitchToMain() {
    const mainProfile = getMainProfile();
    if (mainProfile) {
      switchProfile(mainProfile.id);
      showNotification('Switched to master profile');
      setTimeout(() => window.location.reload(), 500);
    } else {
      showNotification('No master profile found', 'error');
    }
  }

  function handleExportProfile() {
    const data = exportProfileData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `profile-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('Profile exported!');
  }

  function handleImportProfile(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        const name = prompt('Name for imported profile:', 'Imported Profile');
        if (name) {
          const profile = importProfileData(data, name);
          switchProfile(profile.id);
          showNotification('Profile imported!');
          setTimeout(() => window.location.reload(), 500);
        }
      } catch (err) {
        setImportError(err.message);
        showNotification('Import failed: Invalid JSON', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  }

  function handleViewData() {
    const data = exportProfileData();
    setProfileData(data);
    setShowDataViewer(true);
  }

  function refreshActivityDebug() {
    const currentWeekOf = getWeekOf(new Date());
    const allActivities = getActivities();
    const thisWeekActivities = getActivitiesThisWeek();
    const weeklySummary = getWeeklySummary();
    const allWorkouts = getWorkouts();
    const thisWeekWorkouts = getWorkoutsThisWeek();

    // Count activities missing required fields
    const activitiesMissingFields = allActivities.filter(a => !a.weekOf || !a.date);

    // Get active profile info
    const activeProfile = getActiveProfile();
    const activeProfileId = activeProfile?.id || 'unknown';

    // Get raw localStorage data for debugging
    const rawActivitiesKey = getItem('health-advisor-activities');
    let rawActivities = [];
    try {
      rawActivities = rawActivitiesKey ? JSON.parse(rawActivitiesKey) : [];
    } catch (e) {
      console.error('Error parsing raw activities:', e);
    }

    // Also check all localStorage keys that might contain activities
    const allLocalStorageKeys = [];
    const activityKeyData = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes('activit')) {
        const rawData = localStorage.getItem(key);
        let count = 0;
        try {
          const parsed = JSON.parse(rawData);
          count = Array.isArray(parsed) ? parsed.length : 0;
        } catch (e) {}

        allLocalStorageKeys.push({
          key,
          count,
          isActiveProfile: key === `${activeProfileId}:health-advisor-activities`,
          preview: rawData?.substring(0, 100) + '...',
        });
        activityKeyData[key] = rawData;
      }
    }

    setActivityDebugData({
      currentWeekOf,
      activeProfileId,
      activeProfileName: activeProfile?.name || 'Unknown',
      expectedKey: `${activeProfileId}:health-advisor-activities`,
      allActivitiesCount: allActivities.length,
      allActivities: allActivities.slice(0, 20), // Show last 20
      thisWeekActivitiesCount: thisWeekActivities.length,
      thisWeekActivities,
      weeklySummary,
      allWorkoutsCount: allWorkouts.length,
      allWorkouts: allWorkouts.slice(0, 10),
      thisWeekWorkoutsCount: thisWeekWorkouts.length,
      thisWeekWorkouts,
      activitiesMissingFieldsCount: activitiesMissingFields.length,
      activitiesMissingFields,
      rawActivitiesCount: rawActivities.length,
      allLocalStorageKeys,
      activityKeyData,
    });
  }

  function syncActivitiesToActiveProfile() {
    const activeProfile = getActiveProfile();
    if (!activeProfile) {
      showNotification('No active profile found!', 'error');
      return;
    }

    const activeKey = `${activeProfile.id}:health-advisor-activities`;

    // Collect all activities from all sources
    const allActivitiesMap = new Map();

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes('health-advisor-activities')) {
        try {
          const activities = JSON.parse(localStorage.getItem(key) || '[]');
          activities.forEach(a => {
            // Use ID as unique key, prefer newer entries
            if (!allActivitiesMap.has(a.id) ||
                new Date(a.timestamp) > new Date(allActivitiesMap.get(a.id).timestamp)) {
              allActivitiesMap.set(a.id, a);
            }
          });
        } catch (e) {
          console.error(`Error parsing ${key}:`, e);
        }
      }
    }

    // Convert to array and sort by timestamp (newest first)
    const mergedActivities = Array.from(allActivitiesMap.values())
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Save to active profile's key
    localStorage.setItem(activeKey, JSON.stringify(mergedActivities));

    showNotification(`Synced ${mergedActivities.length} activities to ${activeProfile.name}!`);
    refreshActivityDebug();
  }

  function logTestActivity() {
    const activity = logActivity({
      type: ACTIVITY_TYPES.WORKOUT,
      subType: WORKOUT_TYPES.RUN,
      rawText: 'Test run - 3 miles at 9:00 pace',
      summary: 'Test run - 3 miles',
      data: {
        distance: 3,
        pace: '9:00',
        duration: 27,
      },
      source: 'devtools-test',
    });

    showNotification(`Test activity logged! ID: ${activity.id.slice(0, 10)}...`);
    refreshActivityDebug();
  }

  function repairActivities() {
    const activities = getActivities();
    let repaired = 0;

    const fixedActivities = activities.map(activity => {
      // If already has both fields, keep as-is
      if (activity.weekOf && activity.date) {
        return activity;
      }

      repaired++;

      // Use timestamp to calculate date and weekOf
      const timestamp = activity.timestamp || new Date().toISOString();
      const activityDate = new Date(timestamp);

      // Calculate weekOf (Monday of the week)
      const day = activityDate.getDay();
      const diff = activityDate.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(activityDate);
      monday.setDate(diff);
      monday.setHours(0, 0, 0, 0);
      const weekOf = monday.toISOString().split('T')[0];

      return {
        ...activity,
        date: activity.date || activityDate.toISOString().split('T')[0],
        weekOf: activity.weekOf || weekOf,
      };
    });

    // Save repaired activities
    setItem('health-advisor-activities', JSON.stringify(fixedActivities));

    showNotification(`Repaired ${repaired} activities!`);
    refreshActivityDebug();
  }

  function handleClearData() {
    const active = getActiveProfile();
    if (active?.isMain) {
      if (!window.confirm('This is your MASTER profile! Are you absolutely sure you want to clear ALL data? This cannot be undone!')) {
        return;
      }
      if (!window.confirm('FINAL WARNING: This will delete all your real profile data. Type "DELETE" in the next prompt to confirm.')) {
        return;
      }
      const confirmation = prompt('Type DELETE to confirm:');
      if (confirmation !== 'DELETE') {
        showNotification('Cancelled - data not cleared', 'info');
        return;
      }
    } else {
      if (!window.confirm(`Clear all data for "${active?.name}"?`)) {
        return;
      }
    }

    try {
      clearCurrentProfileData();
      showNotification('Data cleared!');
      setTimeout(() => window.location.reload(), 500);
    } catch (err) {
      showNotification(err.message, 'error');
    }
  }

  function handleDeleteTestProfiles() {
    if (!window.confirm('Delete all test profiles? This cannot be undone.')) {
      return;
    }
    deleteAllTestProfiles();
    showNotification('Test profiles deleted!');
    setTimeout(() => window.location.reload(), 500);
  }

  async function handleLegacyImport() {
    if (!user?.id) {
      showNotification('You must be logged in to import data', 'error');
      return;
    }

    if (!legacyImportJson.trim()) {
      showNotification('Please paste your exported JSON data', 'error');
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(legacyImportJson);
    } catch (err) {
      showNotification('Invalid JSON format. Please check your data.', 'error');
      return;
    }

    setImportProgress({ status: 'importing', current: '', counts: {} });
    const counts = {
      profile: 0,
      activities: 0,
      playbook: 0,
      conversations: 0,
      insights: 0,
      checkins: 0,
      errors: 0,
    };

    // Get the active profile ID for localStorage keys
    const profileId = getActiveProfileId();

    // Helper to get data - handles both prefixed and non-prefixed keys
    const getData = (baseKey) => {
      // First check if the parsed JSON has the key directly
      let data = parsed[baseKey];

      // Check with profile prefix
      if (!data) {
        data = parsed[`${profileId}:${baseKey}`];
      }

      // Check for profile_main prefix (common case)
      if (!data) {
        data = parsed[`profile_main:${baseKey}`];
      }

      // Try to find any key containing the base key
      if (!data) {
        const matchingKey = Object.keys(parsed).find(k => k.includes(baseKey));
        if (matchingKey) {
          data = parsed[matchingKey];
        }
      }

      if (!data) return null;

      // Parse if string
      try {
        return typeof data === 'string' ? JSON.parse(data) : data;
      } catch {
        return data;
      }
    };

    // Helper to save to localStorage with profile prefix
    const saveToLocalStorage = (baseKey, data) => {
      const key = `${profileId}:${baseKey}`;
      localStorage.setItem(key, typeof data === 'string' ? data : JSON.stringify(data));
    };

    try {
      // Import Profile data
      setImportProgress({ status: 'importing', current: 'Profile', counts });
      const profileData = getData('health-advisor-profile');
      if (profileData) {
        // Save to Supabase
        const { error } = await dataService.upsertProfile(user.id, profileData);
        if (error) {
          console.error('Profile import error:', error);
          counts.errors++;
        } else {
          counts.profile = 1;
          // Also save to localStorage for immediate app use
          saveToLocalStorage('health-advisor-profile', profileData);
        }
      }

      // Import Activities
      setImportProgress({ status: 'importing', current: 'Activities', counts });
      const activitiesData = getData('health-advisor-activities');
      if (activitiesData && Array.isArray(activitiesData)) {
        // Save all activities to localStorage
        saveToLocalStorage('health-advisor-activities', activitiesData);

        // Also save to Supabase
        for (const activity of activitiesData) {
          const { error } = await dataService.addActivity(user.id, activity);
          if (error) {
            console.error('Activity import error:', error);
            counts.errors++;
          } else {
            counts.activities++;
          }
        }
      }

      // Import Playbook
      setImportProgress({ status: 'importing', current: 'Playbook', counts });
      const playbookData = getData('health-advisor-playbook');
      if (playbookData) {
        // Save to Supabase
        const { error } = await dataService.upsertPlaybook(user.id, playbookData);
        if (error) {
          console.error('Playbook import error:', error);
          counts.errors++;
        } else {
          counts.playbook = 1;
          // Also save to localStorage
          saveToLocalStorage('health-advisor-playbook', playbookData);
        }
      }

      // Import Chat Conversations
      setImportProgress({ status: 'importing', current: 'Conversations', counts });
      const chatsData = getData('health-advisor-chats');
      if (chatsData && Array.isArray(chatsData)) {
        // Save to localStorage
        saveToLocalStorage('health-advisor-chats', chatsData);

        // Also save to Supabase
        for (const chat of chatsData) {
          const { error } = await dataService.upsertConversation(user.id, chat);
          if (error) {
            console.error('Conversation import error:', error);
            counts.errors++;
          } else {
            counts.conversations++;
          }
        }
      }

      // Import Learned Insights
      setImportProgress({ status: 'importing', current: 'Learned Insights', counts });
      const insightsData = getData('health-advisor-learned-insights');
      if (insightsData && Array.isArray(insightsData)) {
        // Save to localStorage
        saveToLocalStorage('health-advisor-learned-insights', insightsData);

        // Also save to Supabase
        for (const insight of insightsData) {
          const { error } = await dataService.addLearnedInsight(user.id, {
            text: insight.text || insight.insight,
            category: insight.category,
            confidence: insight.confidence
          });
          if (error) {
            console.error('Insight import error:', error);
            counts.errors++;
          } else {
            counts.insights++;
          }
        }
      }

      // Import Weekly Check-ins
      setImportProgress({ status: 'importing', current: 'Check-ins', counts });
      const checkinsData = getData('health-advisor-checkins');
      if (checkinsData && Array.isArray(checkinsData)) {
        // Save to localStorage
        saveToLocalStorage('health-advisor-checkins', checkinsData);

        // Also save to Supabase
        for (const checkin of checkinsData) {
          const { error } = await dataService.upsertCheckin(user.id, checkin);
          if (error) {
            console.error('Checkin import error:', error);
            counts.errors++;
          } else {
            counts.checkins++;
          }
        }
      }

      // Import Nutrition Calibration
      const nutritionData = getData('health-advisor-nutrition-calibration');
      if (nutritionData) {
        // Save to localStorage
        saveToLocalStorage('health-advisor-nutrition-calibration', nutritionData);

        // Also save to Supabase
        if (nutritionData.days) {
          for (const [dayName, dayData] of Object.entries(nutritionData.days)) {
            const startDate = nutritionData.startDate || new Date().toISOString().split('T')[0];
            await dataService.upsertNutritionDay(user.id, startDate, dayData, dayData.completed);
          }
        }
      }

      // Import other localStorage-only data (no Supabase equivalent)
      const groceryData = getData('health-advisor-grocery');
      if (groceryData) saveToLocalStorage('health-advisor-grocery', groceryData);

      const groceriesData = getData('health-advisor-groceries');
      if (groceriesData) saveToLocalStorage('health-advisor-groceries', groceriesData);

      const notesData = getData('health-advisor-notes');
      if (notesData) saveToLocalStorage('health-advisor-notes', notesData);

      const bookmarksData = getData('health-advisor-bookmarks');
      if (bookmarksData) saveToLocalStorage('health-advisor-bookmarks', bookmarksData);

      const suggestionsData = getData('health-advisor-playbook-suggestions');
      if (suggestionsData) saveToLocalStorage('health-advisor-playbook-suggestions', suggestionsData);

      const workoutsData = getData('health-advisor-workouts');
      if (workoutsData) saveToLocalStorage('health-advisor-workouts', workoutsData);

      const draftData = getData('health-advisor-draft');
      if (draftData) saveToLocalStorage('health-advisor-draft', draftData);

      setImportProgress({ status: 'complete', current: '', counts });

      const successMsg = `Imported: ${counts.profile} profile, ${counts.activities} activities, ${counts.playbook} playbook, ${counts.conversations} conversations, ${counts.insights} insights, ${counts.checkins} check-ins${counts.errors > 0 ? ` (${counts.errors} errors)` : ''}`;
      showNotification(successMsg, counts.errors > 0 ? 'info' : 'success');

      // Reload the page after a short delay to pick up the new data
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (err) {
      console.error('Legacy import error:', err);
      setImportProgress({ status: 'error', current: err.message, counts });
      showNotification(`Import failed: ${err.message}`, 'error');
    }
  }

  const activeProfile = getActiveProfile();
  const profiles = getProfiles();
  const testProfiles = profiles.filter(p => p.isTest);

  return (
    <>
      {/* Floating Dev Tools Button - only show in non-modal mode */}
      {!isModal && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 right-4 z-40 p-3 bg-violet-600 text-white rounded-full shadow-lg hover:bg-violet-700 transition-all hover:scale-110"
          title="Dev Tools (Ctrl+Shift+D)"
        >
          <Wrench size={20} />
        </button>
      )}

      {/* Dev Tools Panel */}
      {isOpen && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-violet-50 to-purple-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-violet-100 rounded-lg">
                  <FlaskConical size={20} className="text-violet-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Dev Tools</h2>
                  <p className="text-xs text-gray-500">Testing & debugging utilities</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* Current Profile Banner */}
            <div className={`px-6 py-3 flex items-center justify-between ${
              activeProfile?.isTest
                ? 'bg-violet-50 border-b border-violet-100'
                : 'bg-amber-50 border-b border-amber-100'
            }`}>
              <div className="flex items-center gap-2">
                {activeProfile?.isTest ? (
                  <FlaskConical size={16} className="text-violet-600" />
                ) : (
                  <Star size={16} className="text-amber-600" />
                )}
                <span className="text-sm font-medium">
                  Current: <span className={activeProfile?.isTest ? 'text-violet-700' : 'text-amber-700'}>
                    {activeProfile?.name || 'Unknown'}
                  </span>
                </span>
                {activeProfile?.isTest && (
                  <span className="text-[10px] bg-violet-200 text-violet-700 px-1.5 py-0.5 rounded">TEST</span>
                )}
                {activeProfile?.isMain && (
                  <span className="text-[10px] bg-amber-200 text-amber-700 px-1.5 py-0.5 rounded">MASTER</span>
                )}
              </div>
              {activeProfile?.isTest && (
                <button
                  onClick={handleSwitchToMain}
                  className="text-xs text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1"
                >
                  <Shield size={12} />
                  Return to Master
                </button>
              )}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200">
              {[
                { id: 'profiles', label: 'Test Profiles' },
                { id: 'tools', label: 'Tools' },
                { id: 'activity-debug', label: 'Activity Debug' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'text-violet-600 border-b-2 border-violet-600 bg-violet-50/50'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'profiles' && (
                <div className="space-y-4">
                  {/* Protection Notice */}
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <div className="flex items-start gap-2">
                      <Shield size={16} className="text-emerald-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-emerald-800">Master Profile Protected</p>
                        <p className="text-xs text-emerald-600">
                          Loading a test profile creates/updates a separate TEST slot.
                          Your master profile data is never touched.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Test Profile Options */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-gray-700">Load Test Profile</h3>
                    {Object.entries(TEST_PROFILES).map(([key, profile]) => (
                      <button
                        key={key}
                        onClick={() => handleLoadTestProfile(key)}
                        disabled={loading !== null}
                        className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                          loading === key
                            ? 'border-violet-300 bg-violet-50'
                            : 'border-gray-200 hover:border-violet-300 hover:bg-violet-50/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-violet-100 rounded-lg">
                              <User size={18} className="text-violet-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{profile.name}</p>
                              <p className="text-xs text-gray-500">{profile.description}</p>
                            </div>
                          </div>
                          {loading === key ? (
                            <RefreshCw size={18} className="text-violet-600 animate-spin" />
                          ) : (
                            <ChevronRight size={18} className="text-gray-400" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Existing Test Profiles */}
                  {testProfiles.length > 0 && (
                    <div className="pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-700">
                          Active Test Profiles ({testProfiles.length})
                        </h3>
                        <button
                          onClick={handleDeleteTestProfiles}
                          className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1"
                        >
                          <Trash2 size={12} />
                          Delete All
                        </button>
                      </div>
                      <div className="space-y-1">
                        {testProfiles.map(profile => (
                          <div
                            key={profile.id}
                            className={`flex items-center justify-between p-2 rounded-lg ${
                              profile.id === activeProfile?.id
                                ? 'bg-violet-100'
                                : 'bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <FlaskConical size={14} className="text-violet-500" />
                              <span className="text-sm text-gray-700">{profile.name}</span>
                              {profile.id === activeProfile?.id && (
                                <Check size={14} className="text-violet-600" />
                              )}
                            </div>
                            {profile.id !== activeProfile?.id && (
                              <button
                                onClick={() => {
                                  switchProfile(profile.id);
                                  window.location.reload();
                                }}
                                className="text-xs text-violet-600 hover:text-violet-700"
                              >
                                Switch
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'tools' && (
                <div className="space-y-4">
                  {/* Tutorial Tools */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-gray-700">Tutorial</h3>

                    <button
                      onClick={() => {
                        localStorage.removeItem('health-advisor-tutorial-completed');
                        showNotification('Tutorial reset! Reload to see it again.');
                      }}
                      className="w-full p-3 rounded-xl border border-gray-200 hover:border-violet-300 hover:bg-violet-50/50 text-left transition-all flex items-center gap-3"
                    >
                      <div className="p-2 bg-violet-100 rounded-lg">
                        <BookOpen size={16} className="text-violet-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Reset Tutorial State</p>
                        <p className="text-xs text-gray-500">Show tutorial again on next onboarding</p>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        const count = getInsightCount();
                        if (count === 0) {
                          showNotification('No learned insights to clear', 'info');
                          return;
                        }
                        if (window.confirm(`Clear all ${count} learned insights?`)) {
                          clearLearnedInsights();
                          showNotification(`Cleared ${count} learned insights!`);
                        }
                      }}
                      className="w-full p-3 rounded-xl border border-gray-200 hover:border-amber-300 hover:bg-amber-50/50 text-left transition-all flex items-center gap-3"
                    >
                      <div className="p-2 bg-amber-100 rounded-lg">
                        <Sparkles size={16} className="text-amber-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Clear Learned Insights</p>
                        <p className="text-xs text-gray-500">Reset what the Advisor has learned about you</p>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        const existingCheckIn = getCurrentWeekCheckIn();
                        if (!existingCheckIn) {
                          showNotification('No check-in data for this week', 'info');
                          return;
                        }
                        clearCurrentWeekCheckIn();
                        showNotification('Check-in data cleared! Reload to test again.');
                        setTimeout(() => window.location.reload(), 1000);
                      }}
                      className="w-full p-3 rounded-xl border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-left transition-all flex items-center gap-3"
                    >
                      <div className="p-2 bg-indigo-100 rounded-lg">
                        <RefreshCw size={16} className="text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Clear Weekly Check-in</p>
                        <p className="text-xs text-gray-500">Reset check-in data to test the flow again</p>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        const draft = getDraft();
                        if (!draft) {
                          showNotification('No draft saved', 'info');
                          return;
                        }
                        clearDraft();
                        showNotification('Draft cleared! Close and reopen check-in.');
                      }}
                      className="w-full p-3 rounded-xl border border-gray-200 hover:border-orange-300 hover:bg-orange-50/50 text-left transition-all flex items-center gap-3"
                    >
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <Trash2 size={16} className="text-orange-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Clear Check-in Draft</p>
                        <p className="text-xs text-gray-500">Remove saved draft that may have stale summary</p>
                      </div>
                    </button>
                  </div>

                  {/* Data Tools */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-gray-700">Data Tools</h3>

                    <button
                      onClick={handleViewData}
                      className="w-full p-3 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 text-left transition-all flex items-center gap-3"
                    >
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Eye size={16} className="text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">View Current Profile Data</p>
                        <p className="text-xs text-gray-500">See all stored data for debugging</p>
                      </div>
                    </button>

                    <button
                      onClick={handleExportProfile}
                      className="w-full p-3 rounded-xl border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/50 text-left transition-all flex items-center gap-3"
                    >
                      <div className="p-2 bg-emerald-100 rounded-lg">
                        <Download size={16} className="text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Export Profile as JSON</p>
                        <p className="text-xs text-gray-500">Download current profile data</p>
                      </div>
                    </button>

                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full p-3 rounded-xl border border-gray-200 hover:border-amber-300 hover:bg-amber-50/50 text-left transition-all flex items-center gap-3"
                    >
                      <div className="p-2 bg-amber-100 rounded-lg">
                        <Upload size={16} className="text-amber-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Import Profile from JSON</p>
                        <p className="text-xs text-gray-500">Load a previously exported profile</p>
                      </div>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json"
                      onChange={handleImportProfile}
                      className="hidden"
                    />

                    <button
                      onClick={() => setShowLegacyImport(true)}
                      className="w-full p-3 rounded-xl border-2 border-dashed border-violet-300 hover:border-violet-400 hover:bg-violet-50/50 text-left transition-all flex items-center gap-3"
                    >
                      <div className="p-2 bg-violet-100 rounded-lg">
                        <Database size={16} className="text-violet-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-violet-900">Import Legacy Data to Supabase</p>
                        <p className="text-xs text-violet-600">Migrate old localStorage data to cloud storage</p>
                      </div>
                    </button>
                  </div>

                  {/* Danger Zone */}
                  <div className="pt-4 border-t border-gray-200">
                    <h3 className="text-sm font-medium text-red-700 mb-2 flex items-center gap-1">
                      <AlertTriangle size={14} />
                      Danger Zone
                    </h3>

                    <button
                      onClick={handleClearData}
                      className="w-full p-3 rounded-xl border border-red-200 hover:border-red-300 hover:bg-red-50/50 text-left transition-all flex items-center gap-3"
                    >
                      <div className="p-2 bg-red-100 rounded-lg">
                        <Trash2 size={16} className="text-red-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-red-700">Clear Current Profile Data</p>
                        <p className="text-xs text-red-500">
                          {activeProfile?.isMain
                            ? 'WARNING: This is your master profile!'
                            : 'Reset this profile to empty state'}
                        </p>
                      </div>
                    </button>
                  </div>

                  {/* Keyboard Shortcut */}
                  <div className="pt-4 border-t border-gray-200">
                    <p className="text-xs text-gray-500 text-center">
                      Tip: Press <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-700">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-700">Shift</kbd> + <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-700">D</kbd> to toggle Dev Tools
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'activity-debug' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-700">Activity Log Debug</h3>
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={refreshActivityDebug}
                        className="px-3 py-1.5 bg-violet-600 text-white text-xs rounded-lg hover:bg-violet-700 flex items-center gap-1"
                      >
                        <RefreshCw size={12} />
                        Refresh Data
                      </button>
                      <button
                        onClick={logTestActivity}
                        className="px-3 py-1.5 bg-emerald-600 text-white text-xs rounded-lg hover:bg-emerald-700 flex items-center gap-1"
                      >
                        + Log Test Activity
                      </button>
                      {activityDebugData?.activitiesMissingFieldsCount > 0 && (
                        <button
                          onClick={repairActivities}
                          className="px-3 py-1.5 bg-amber-600 text-white text-xs rounded-lg hover:bg-amber-700 flex items-center gap-1"
                        >
                          <AlertTriangle size={12} />
                          Repair ({activityDebugData.activitiesMissingFieldsCount})
                        </button>
                      )}
                    </div>
                  </div>

                  {!activityDebugData ? (
                    <div className="p-4 bg-gray-50 rounded-xl text-center">
                      <p className="text-sm text-gray-500">Click "Refresh Data" to load activity debug info</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Active Profile Info */}
                      <div className="p-3 bg-violet-50 border border-violet-200 rounded-xl">
                        <p className="text-sm font-medium text-violet-800">
                          Active Profile: <span className="font-mono">{activityDebugData.activeProfileName}</span>
                        </p>
                        <p className="text-xs text-violet-600 mt-1 font-mono break-all">
                          Reading from: {activityDebugData.expectedKey}
                        </p>
                      </div>

                      {/* Week Info */}
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                        <p className="text-sm font-medium text-blue-800">
                          Current Week Of: <span className="font-mono">{activityDebugData.currentWeekOf}</span>
                        </p>
                        <p className="text-xs text-blue-600 mt-1">
                          Activities must have weekOf = "{activityDebugData.currentWeekOf}" to appear in this week's check-in
                        </p>
                      </div>

                      {/* Summary Stats */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-gray-50 rounded-xl">
                          <p className="text-2xl font-bold text-gray-900">{activityDebugData.thisWeekActivitiesCount}</p>
                          <p className="text-xs text-gray-500">Activities This Week</p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-xl">
                          <p className="text-2xl font-bold text-gray-900">{activityDebugData.allActivitiesCount}</p>
                          <p className="text-xs text-gray-500">Total Activities</p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-xl">
                          <p className="text-2xl font-bold text-gray-900">{activityDebugData.thisWeekWorkoutsCount}</p>
                          <p className="text-xs text-gray-500">Workouts This Week</p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-xl">
                          <p className="text-2xl font-bold text-gray-900">{activityDebugData.allWorkoutsCount}</p>
                          <p className="text-xs text-gray-500">Total Workouts</p>
                        </div>
                      </div>

                      {/* Weekly Summary */}
                      <div className="p-3 bg-green-50 border border-green-200 rounded-xl">
                        <p className="text-sm font-medium text-green-800 mb-1">Weekly Summary (from getWeeklySummary)</p>
                        <pre className="text-xs text-green-700 whitespace-pre-wrap">
                          {JSON.stringify(activityDebugData.weeklySummary, null, 2)}
                        </pre>
                      </div>

                      {/* Activities Missing Fields */}
                      {activityDebugData.activitiesMissingFieldsCount > 0 && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-red-800">
                              ⚠️ {activityDebugData.activitiesMissingFieldsCount} activities missing date/weekOf fields!
                            </p>
                          </div>
                          <p className="text-xs text-red-600 mb-2">
                            These won't appear in weekly check-ins. Click "Repair" to fix them.
                          </p>
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {activityDebugData.activitiesMissingFields.slice(0, 5).map((activity, idx) => (
                              <div key={idx} className="p-2 bg-red-100 rounded text-xs">
                                <span className="font-medium">{activity.type}</span>: {activity.summary || activity.rawText}
                                <span className="text-red-500 ml-2">
                                  (date: {activity.date || 'MISSING'}, weekOf: {activity.weekOf || 'MISSING'})
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* This Week's Activities */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">
                          This Week's Activities ({activityDebugData.thisWeekActivitiesCount})
                        </h4>
                        {activityDebugData.thisWeekActivities.length === 0 ? (
                          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                            <p className="text-sm text-amber-800">No activities found for this week!</p>
                            <p className="text-xs text-amber-600 mt-1">
                              This is why the check-in shows "no activities logged"
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {activityDebugData.thisWeekActivities.map((activity, idx) => (
                              <div key={idx} className="p-2 bg-gray-50 rounded-lg text-xs">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-medium text-gray-800">{activity.type} / {activity.subType || 'general'}</span>
                                  <span className="text-gray-500 font-mono">{activity.weekOf}</span>
                                </div>
                                <p className="text-gray-600">{activity.summary || activity.rawText}</p>
                                <p className="text-gray-400 mt-1">Date: {activity.date} | ID: {activity.id?.slice(0, 12)}...</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* All Activities (recent) */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">
                          All Activities (last 20 of {activityDebugData.allActivitiesCount})
                        </h4>
                        {activityDebugData.allActivities.length === 0 ? (
                          <p className="text-sm text-gray-500">No activities in store</p>
                        ) : (
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {activityDebugData.allActivities.map((activity, idx) => (
                              <div key={idx} className={`p-2 rounded-lg text-xs ${
                                activity.weekOf === activityDebugData.currentWeekOf
                                  ? 'bg-green-50 border border-green-200'
                                  : 'bg-gray-50'
                              }`}>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-medium text-gray-800">{activity.type} / {activity.subType || 'general'}</span>
                                  <span className={`font-mono ${
                                    activity.weekOf === activityDebugData.currentWeekOf
                                      ? 'text-green-600 font-bold'
                                      : 'text-gray-500'
                                  }`}>{activity.weekOf || 'MISSING!'}</span>
                                </div>
                                <p className="text-gray-600">{activity.summary || activity.rawText}</p>
                                <p className="text-gray-400 mt-1">Date: {activity.date}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Workouts Store */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">
                          Workout Store (separate) - This Week: {activityDebugData.thisWeekWorkoutsCount}
                        </h4>
                        {activityDebugData.thisWeekWorkouts.length === 0 ? (
                          <p className="text-sm text-gray-500">No workouts in workout store this week</p>
                        ) : (
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {activityDebugData.thisWeekWorkouts.map((workout, idx) => (
                              <div key={idx} className="p-2 bg-violet-50 rounded-lg text-xs">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-medium text-violet-800">{workout.exercise || workout.type}</span>
                                  <span className="text-violet-500 font-mono">{workout.weekOf}</span>
                                </div>
                                <p className="text-violet-600">{workout.rawText}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Raw localStorage Debug */}
                      <div className="pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium text-gray-700">
                            Raw localStorage Keys (containing "activit")
                          </h4>
                          {activityDebugData.allLocalStorageKeys?.length > 1 && (
                            <button
                              onClick={syncActivitiesToActiveProfile}
                              className="px-3 py-1.5 bg-orange-600 text-white text-xs rounded-lg hover:bg-orange-700 flex items-center gap-1"
                            >
                              Sync All to Active Profile
                            </button>
                          )}
                        </div>

                        {activityDebugData.allLocalStorageKeys?.length > 1 && (
                          <div className="p-2 bg-orange-50 border border-orange-200 rounded-lg mb-2">
                            <p className="text-xs text-orange-800">
                              ⚠️ Activities are split across {activityDebugData.allLocalStorageKeys.length} keys!
                              Click "Sync All" to merge them into your active profile.
                            </p>
                          </div>
                        )}

                        {activityDebugData.allLocalStorageKeys?.length === 0 ? (
                          <p className="text-sm text-red-500">No activity keys found in localStorage!</p>
                        ) : (
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {activityDebugData.allLocalStorageKeys?.map((item, idx) => (
                              <div key={idx} className={`p-2 rounded-lg text-xs ${
                                item.isActiveProfile
                                  ? 'bg-green-100 border border-green-300'
                                  : 'bg-gray-100'
                              }`}>
                                <div className="flex items-center justify-between">
                                  <p className="font-mono font-medium text-gray-800 break-all">{item.key}</p>
                                  <span className={`px-2 py-0.5 rounded text-xs ${
                                    item.isActiveProfile
                                      ? 'bg-green-500 text-white'
                                      : 'bg-gray-300 text-gray-700'
                                  }`}>
                                    {item.count} items {item.isActiveProfile && '✓ ACTIVE'}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-gray-400 mt-2">
                          Raw count via getItem: {activityDebugData.rawActivitiesCount} |
                          Via getActivities(): {activityDebugData.allActivitiesCount}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Notification Toast */}
            {notification && (
              <div className={`absolute top-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg shadow-lg text-sm font-medium animate-slide-down ${
                notification.type === 'error'
                  ? 'bg-red-500 text-white'
                  : notification.type === 'info'
                  ? 'bg-blue-500 text-white'
                  : 'bg-emerald-500 text-white'
              }`}>
                {notification.message}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Data Viewer Modal */}
      {showDataViewer && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[110] p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Profile Data Viewer</h2>
              <button
                onClick={() => setShowDataViewer(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <pre className="text-xs text-gray-700 whitespace-pre-wrap bg-gray-50 p-4 rounded-xl">
                {JSON.stringify(profileData, null, 2)}
              </pre>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(profileData, null, 2));
                  showNotification('Copied to clipboard!');
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
              >
                Copy to Clipboard
              </button>
              <button
                onClick={() => setShowDataViewer(false)}
                className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Legacy Import Modal */}
      {showLegacyImport && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[110] p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-violet-50 to-purple-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-violet-100 rounded-lg">
                  <Database size={20} className="text-violet-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Import Legacy Data</h2>
                  <p className="text-xs text-gray-500">Migrate localStorage data to Supabase</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowLegacyImport(false);
                  setLegacyImportJson('');
                  setImportProgress(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6">
              {!importProgress ? (
                <>
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                    <p className="text-sm text-blue-800">
                      <strong>Instructions:</strong> Paste your exported localStorage JSON below.
                      This will import your profile, activities, playbook, conversations, insights, and check-ins to Supabase.
                    </p>
                  </div>

                  <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                    <p className="text-sm text-amber-800">
                      <strong>Note:</strong> If you haven't exported your data yet, visit{' '}
                      <code className="bg-amber-100 px-1 rounded">/export-localstorage.html</code>{' '}
                      on your old app to get your JSON data.
                    </p>
                  </div>

                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Paste your exported JSON:
                  </label>
                  <textarea
                    value={legacyImportJson}
                    onChange={(e) => setLegacyImportJson(e.target.value)}
                    placeholder='{"health-advisor-profile": {...}, "health-advisor-activities": [...], ...}'
                    className="w-full h-64 p-4 border border-gray-300 rounded-xl font-mono text-xs resize-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                  />
                </>
              ) : (
                <div className="py-8">
                  {importProgress.status === 'importing' && (
                    <div className="text-center">
                      <Loader2 size={48} className="mx-auto text-violet-600 animate-spin mb-4" />
                      <p className="text-lg font-medium text-gray-900 mb-2">
                        Importing {importProgress.current}...
                      </p>
                      <div className="text-sm text-gray-500 space-y-1">
                        {importProgress.counts.profile > 0 && <p>✓ Profile imported</p>}
                        {importProgress.counts.activities > 0 && <p>✓ {importProgress.counts.activities} activities imported</p>}
                        {importProgress.counts.playbook > 0 && <p>✓ Playbook imported</p>}
                        {importProgress.counts.conversations > 0 && <p>✓ {importProgress.counts.conversations} conversations imported</p>}
                        {importProgress.counts.insights > 0 && <p>✓ {importProgress.counts.insights} insights imported</p>}
                        {importProgress.counts.checkins > 0 && <p>✓ {importProgress.counts.checkins} check-ins imported</p>}
                      </div>
                    </div>
                  )}

                  {importProgress.status === 'complete' && (
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                        <Check size={32} className="text-emerald-600" />
                      </div>
                      <p className="text-lg font-medium text-gray-900 mb-4">Import Complete!</p>
                      <div className="text-sm text-gray-600 space-y-1 bg-gray-50 p-4 rounded-xl">
                        <p><strong>Profile:</strong> {importProgress.counts.profile > 0 ? '✓ Imported' : '- None'}</p>
                        <p><strong>Activities:</strong> {importProgress.counts.activities}</p>
                        <p><strong>Playbook:</strong> {importProgress.counts.playbook > 0 ? '✓ Imported' : '- None'}</p>
                        <p><strong>Conversations:</strong> {importProgress.counts.conversations}</p>
                        <p><strong>Insights:</strong> {importProgress.counts.insights}</p>
                        <p><strong>Check-ins:</strong> {importProgress.counts.checkins}</p>
                        {importProgress.counts.errors > 0 && (
                          <p className="text-red-600"><strong>Errors:</strong> {importProgress.counts.errors}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {importProgress.status === 'error' && (
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
                        <AlertTriangle size={32} className="text-red-600" />
                      </div>
                      <p className="text-lg font-medium text-gray-900 mb-2">Import Failed</p>
                      <p className="text-sm text-red-600">{importProgress.current}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {!importProgress && (
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowLegacyImport(false);
                    setLegacyImportJson('');
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLegacyImport}
                  disabled={!legacyImportJson.trim()}
                  className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Upload size={16} />
                  Import to Supabase
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
