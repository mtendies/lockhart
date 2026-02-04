import { useState, useEffect, useRef, Component } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Auth from './components/Auth';
import PreOnboardingIntro from './components/PreOnboardingIntro';
import FeedbackButton from './components/FeedbackButton';
import AdminFeedback from './components/AdminFeedback';
import * as dataService from './lib/dataService';
import { useSimpleSync } from './hooks/useSimpleSync';
import { migrateToNewSync, verifyMigration, debugLocalStorage } from './lib/migrateSyncData';

// Error boundary to catch and display React errors
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('React Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-lg bg-red-50 border border-red-200 rounded-xl p-6">
            <h2 className="text-lg font-bold text-red-800 mb-2">Something went wrong</h2>
            <pre className="text-sm text-red-600 whitespace-pre-wrap overflow-auto max-h-64">
              {this.state.error?.toString()}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

import { getProfile, saveProfile } from './store';
import { initBackupSystem, clearStaleDraft, restoreFromBackup, getBackup } from './dataBackup';
import { getNotes, clearNotes } from './notesStore';
import { initializeProfiles } from './profileStore';
import { getPendingCount, getPendingSuggestions, addSuggestion, dismissSuggestion } from './playbookSuggestionsStore';
import { getPlaybook, savePlaybook } from './playbookStore';
import { analyzeProfileChange } from './profileChangeDetector';
import { shouldShowSundayReminder, dismissReminderTemporarily, getDismissCount, skipThisWeek } from './checkInStore';
import { getGroceryData } from './groceryStore';
import { getActivitiesThisWeek } from './activityLogStore';

// Components
import Onboarding from './components/Onboarding';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import HomePage from './components/HomePage';
import AdvisorPage from './components/AdvisorPage';
import Nutrition from './components/Nutrition';
import TrainingPage from './components/TrainingPage';
import ProfileView from './components/ProfileView';
import WeeklyCheckIn from './components/WeeklyCheckIn';
import SundayReminderModal from './components/SundayReminderModal';
import DevTools from './components/DevTools';
import Tutorial from './components/Tutorial';
import ProfileSwitcherModal from './components/ProfileSwitcherModal';
import LearnedInsightsPage from './components/LearnedInsightsPage';
import { InsightNotificationContainer } from './components/InsightNotification';
import { getLearnedInsights } from './learnedInsightsStore';

function AppContent() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { syncStatus, refresh, pushAll, isReady, isLoading } = useSimpleSync();

  // Expose sync functions globally for console access
  useEffect(() => {
    // Pull fresh data from Supabase
    window.__forceSupabasePull = async () => {
      console.log('Forcing data recovery from Supabase...');
      const result = await refresh();
      if (result?.success) {
        console.log('Data restored! Page will reload...');
      } else {
        console.log('No data found in Supabase or recovery failed.');
      }
      return result;
    };

    // Push all localStorage to Supabase
    window.__pushAllToSupabase = pushAll;

    // ONE-TIME MIGRATION: Push localStorage to new JSONB columns
    window.__migrateToNewSync = migrateToNewSync;
    window.__verifyMigration = verifyMigration;
    window.__debugLocalStorage = debugLocalStorage;

    return () => {
      delete window.__forceSupabasePull;
      delete window.__pushAllToSupabase;
      delete window.__migrateToNewSync;
      delete window.__verifyMigration;
      delete window.__debugLocalStorage;
    };
  }, [refresh, pushAll]);
  const [profile, setProfile] = useState(null);
  const [notes, setNotes] = useState({});
  const [loading, setLoading] = useState(true);
  const [syncWaitExpired, setSyncWaitExpired] = useState(false);

  // Timeout for waiting on sync - don't wait forever
  // Increased to 10 seconds to handle slow mobile networks
  useEffect(() => {
    const timer = setTimeout(() => {
      console.log('[App] Sync wait timeout expired');
      setSyncWaitExpired(true);
    }, 10000); // Wait max 10 seconds for sync
    return () => clearTimeout(timer);
  }, []);
  const [view, setView] = useState('home');
  const [scrollTarget, setScrollTarget] = useState(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [suggestionCount, setSuggestionCount] = useState(0);
  const [analyzingProfile, setAnalyzingProfile] = useState(false);
  const [notification, setNotification] = useState(null);
  const [playbook, setPlaybook] = useState(null);
  const [showSundayReminder, setShowSundayReminder] = useState(false);
  const [analyzingCheckIn, setAnalyzingCheckIn] = useState(false);
  const [groceryData, setGroceryData] = useState(null);
  const [initialQuestion, setInitialQuestion] = useState(null);
  const [activityLogs, setActivityLogs] = useState([]);
  const [showTutorial, setShowTutorial] = useState(false);
  const [insightNotifications, setInsightNotifications] = useState([]);
  const [targetChatId, setTargetChatId] = useState(null);
  const [showProfileSwitcher, setShowProfileSwitcher] = useState(false);
  const [showDevTools, setShowDevTools] = useState(false);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const previousProfileRef = useRef(null);

  // Check for admin feedback URL on load
  useEffect(() => {
    if (window.location.pathname === '/admin/feedback' || window.location.hash === '#admin-feedback') {
      setView('admin-feedback');
    }
  }, []);

  // Global keyboard shortcut for Dev Tools (Ctrl+Shift+D) and Admin (Ctrl+Shift+A)
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        console.log('App.jsx: Ctrl+Shift+D pressed, toggling DevTools');
        setShowDevTools(prev => !prev);
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        setView('admin-feedback');
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    // Initialize profile system first (handles migration of existing data)
    initializeProfiles();

    // Initialize backup system and clear stale drafts
    clearStaleDraft();
    initBackupSystem();

    // Try to load profile, with backup recovery if needed
    let saved = getProfile();

    // If no profile found, check if we have a backup to recover from
    if (!saved) {
      const backup = getBackup();
      if (backup?.data?.['health-advisor-profile']) {
        console.log('Profile missing but backup exists, attempting recovery...');
        if (restoreFromBackup()) {
          saved = getProfile();
          if (saved) {
            console.log('Profile recovered from backup!');
          }
        }
      }
    }

    if (saved) {
      setProfile(saved);
      previousProfileRef.current = saved;
    }
    setNotes(getNotes());
    setSuggestionCount(getPendingCount());
    setPlaybook(getPlaybook());
    setGroceryData(getGroceryData());
    setActivityLogs(getActivitiesThisWeek());

    // Check for Sunday reminder after a short delay to let the app render
    setTimeout(() => {
      if (shouldShowSundayReminder()) {
        setShowSundayReminder(true);
      }
    }, 500);

    setLoading(false);
  }, []);

  // Reload all data after Supabase sync completes
  // Data is loaded directly into localStorage by simpleSync, so we re-read from localStorage
  useEffect(() => {
    if (isReady) {
      console.log('[App] Supabase sync complete, reloading data from localStorage');

      // Re-read profile from localStorage (which now has Supabase data)
      const saved = getProfile();
      if (saved) {
        console.log('[App] Loaded profile:', saved.name);
        setProfile(saved);
        previousProfileRef.current = saved;
      }

      setNotes(getNotes());
      setPlaybook(getPlaybook());
      setActivityLogs(getActivitiesThisWeek());
    }
  }, [isReady]);

  // Refresh playbook from localStorage - call this after any playbook modification
  function refreshPlaybook() {
    const updatedPlaybook = getPlaybook();
    setPlaybook(updatedPlaybook);
  }

  function refreshSuggestionCount() {
    setSuggestionCount(getPendingCount());
  }

  // Refresh activity logs - call after logging new activities
  function refreshActivityLogs() {
    setActivityLogs(getActivitiesThisWeek());
  }

  function handleOnboardingComplete(data, wasEditing = false) {
    if (wasEditing && previousProfileRef.current) {
      // Use the profile update flow to trigger analysis
      handleProfileUpdate(data);
    } else {
      // First-time onboarding - save and show tutorial
      saveProfile(data);
      setProfile(data);
      previousProfileRef.current = data;

      // Show tutorial for first-time users
      const tutorialCompleted = localStorage.getItem('health-advisor-tutorial-completed');
      if (!tutorialCompleted) {
        setShowTutorial(true);
      }
    }
  }

  function handleTutorialComplete() {
    localStorage.setItem('health-advisor-tutorial-completed', 'true');
    setShowTutorial(false);
  }

  function handleShowTutorial() {
    setShowTutorial(true);
  }

  // Handle new insights from Chat
  function handleNewInsight(insight) {
    setInsightNotifications(prev => [...prev, insight]);
  }

  function handleDismissInsightNotification(id) {
    setInsightNotifications(prev => prev.filter(n => n.id !== id));
  }

  // Navigate to a specific chat message from ProfileView
  function handleNavigateToChat(chatId, messageIndex) {
    setTargetChatId(chatId);
    setScrollTarget(messageIndex);
    setView('advisor');
  }

  // Handle partial profile updates from Chat (e.g., just weight change)
  function handlePartialProfileUpdate(partialUpdate) {
    if (!profile || !partialUpdate) return;
    const updatedProfile = { ...profile, ...partialUpdate };
    handleProfileUpdate(updatedProfile);
  }

  async function handleProfileUpdate(updatedProfile) {
    const oldProfile = previousProfileRef.current;

    // Save and update state immediately
    saveProfile(updatedProfile);
    setProfile(updatedProfile);

    // Analyze changes in background
    if (oldProfile) {
      setAnalyzingProfile(true);
      try {
        const playbook = getPlaybook();
        const pendingSuggestions = getPendingSuggestions();
        const result = await analyzeProfileChange(oldProfile, updatedProfile, playbook, pendingSuggestions);

        if (result) {
          // Handle suggestions to dismiss (resolved issues)
          if (result.dismissSuggestionIds && result.dismissSuggestionIds.length > 0) {
            for (const id of result.dismissSuggestionIds) {
              dismissSuggestion(id, 'auto_resolved');
            }
          }

          // Handle new suggestion
          if (result.suggestion) {
            addSuggestion(result.suggestion);

            setNotification({
              type: 'suggestion',
              message: 'Your Advisor has a suggestion for your Playbook',
            });
            setTimeout(() => setNotification(null), 5000);
          }

          // Handle positive acknowledgment (issue resolved, no action needed)
          if (result.resolved && !result.suggestion) {
            setNotification({
              type: 'resolved',
              message: result.message || 'Great improvement! No playbook changes needed.',
            });
            setTimeout(() => setNotification(null), 4000);
          }

          refreshSuggestionCount();
        }
      } catch (err) {
        console.error('Error analyzing profile change:', err);
      } finally {
        setAnalyzingProfile(false);
      }
    }

    // Update reference for next comparison
    previousProfileRef.current = updatedProfile;
  }

  const [navigateSection, setNavigateSection] = useState(null);

  function handleNavigate(target, section = null, question = null, createNewChat = false) {
    // Map old view names to new ones
    const viewMap = {
      'dashboard': 'home',
      'chat': 'advisor',
      'playbook': 'home', // Playbook will be merged into home
      'bookmarks': 'advisor', // Bookmarks now under advisor
    };

    const newView = viewMap[target] || target;
    setScrollTarget(null);
    setNavigateSection(section);
    setView(newView);

    // Set initial question if provided (e.g., from quick entry on Home)
    // Include createNewChat flag to signal Chat component to create new chat
    if (question) {
      setInitialQuestion({ text: question, createNewChat });
    } else if (newView !== 'advisor') {
      setInitialQuestion(null);
    }

    // Scroll to top of page when navigating (except for advisor which manages its own scroll)
    if (newView !== 'advisor') {
      window.scrollTo(0, 0);
    }
  }

  function handleScrollToMessage(messageIndex) {
    setScrollTarget(messageIndex);
    setView('advisor');
  }

  function handleAskQuestion(question, createNewChat = false) {
    setInitialQuestion({ text: question, createNewChat });
    setView('advisor');
  }

  function handleSundayReminderDismiss() {
    dismissReminderTemporarily(3); // Dismiss for 3 hours
    setShowSundayReminder(false);
  }

  function handleSundayReminderSkip() {
    skipThisWeek();
    setShowSundayReminder(false);
  }

  function handleSundayReminderCheckIn() {
    setShowSundayReminder(false);
    setShowCheckInModal(true);
  }

  function handleCloseCheckIn() {
    setShowCheckInModal(false);
    setView('home');
  }

  function handleOpenCheckIn() {
    setShowCheckInModal(true);
  }

  async function handleCheckInComplete(checkInData) {
    // Analyze the check-in and suggest playbook updates
    if (!playbook) return;

    setAnalyzingCheckIn(true);
    try {
      const res = await fetch('/api/analyze-checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkIn: checkInData,
          playbook,
          profile,
        }),
      });

      if (res.ok) {
        const result = await res.json();

        if (result.suggestions && result.suggestions.length > 0) {
          for (const suggestion of result.suggestions) {
            addSuggestion({
              ...suggestion,
              trigger: 'weekly_checkin',
            });
          }

          setNotification({
            type: 'suggestion',
            message: `Your Advisor has ${result.suggestions.length} suggestion${result.suggestions.length > 1 ? 's' : ''} based on your check-in`,
          });
          setTimeout(() => setNotification(null), 5000);
          refreshSuggestionCount();
        }
      }
    } catch (err) {
      console.error('Error analyzing check-in:', err);
    } finally {
      setAnalyzingCheckIn(false);
    }
  }

  function handleGrocerySuggestion(suggestion) {
    // Add grocery-triggered playbook suggestion
    addSuggestion({
      ...suggestion,
      trigger: suggestion.trigger || 'grocery_sync',
    });

    setNotification({
      type: 'suggestion',
      message: 'Your Advisor has a suggestion based on your groceries',
    });
    setTimeout(() => setNotification(null), 5000);
  }

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  // If authenticated but no profile and sync hasn't completed yet, wait for sync
  // This prevents showing Onboarding before Supabase data has loaded
  // 'idle' means sync hasn't started yet, 'syncing' means it's in progress
  // But don't wait forever - timeout after 10 seconds
  if (user && !profile && isLoading && !syncWaitExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-3">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        <p className="text-sm text-gray-500">Loading your profile...</p>
      </div>
    );
  }

  if (!profile || editingProfile) {
    const wasEditing = editingProfile;
    return (
      <>
        <Onboarding
          onComplete={(data) => {
            handleOnboardingComplete(data, wasEditing);
            setEditingProfile(false);
          }}
          initialData={editingProfile ? profile : undefined}
          onCancel={editingProfile ? () => setEditingProfile(false) : undefined}
        />
        {/* Dev Tools available even during onboarding */}
        <DevTools />
        {/* Feedback button during onboarding */}
        <FeedbackButton currentPage="onboarding" />
      </>
    );
  }

  return (
    <ErrorBoundary>
      <div className="h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 flex flex-col overflow-hidden">
        {/* Header with Profile Dropdown */}
        <Header
          onNavigateToProfile={() => setView('profile')}
          onNavigateToLearnedInsights={() => setView('learned')}
          onOpenProfileSwitcher={() => setShowProfileSwitcher(true)}
          onOpenDevTools={() => {
            console.log('App.jsx: onOpenDevTools called, setting showDevTools to true');
            setShowDevTools(true);
          }}
          onShowTutorial={handleShowTutorial}
          onOpenFeedback={() => setShowFeedback(true)}
        />

        {/* Notification Toast */}
        {notification && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 animate-slide-down">
            {notification.type === 'resolved' ? (
              <div
                className="bg-emerald-50 border border-emerald-200 rounded-xl shadow-lg px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-emerald-100 transition-colors"
                onClick={() => setNotification(null)}
              >
                <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-sm text-emerald-800 font-medium">{notification.message}</span>
              </div>
            ) : (
              <div
                className="bg-amber-50 border border-amber-200 rounded-xl shadow-lg px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-amber-100 transition-colors"
                onClick={() => {
                  setNotification(null);
                  handleNavigate('home');
                }}
              >
                <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                <span className="text-sm text-amber-800 font-medium">{notification.message}</span>
                <span className="text-xs text-amber-600">View →</span>
              </div>
            )}
          </div>
        )}

        {/* Main Content - flex-1 with overflow handling */}
        <div className="flex-1 flex flex-col min-h-0 pb-safe">
          {view === 'home' && (
            <div className="flex-1 overflow-y-auto">
              <HomePage
                onNavigate={handleNavigate}
                onOpenCheckIn={handleOpenCheckIn}
                syncStatus={syncStatus}
                onRefresh={refresh}
              />
            </div>
          )}

          {view === 'advisor' && (
            <AdvisorPage
              profile={profile}
              playbook={playbook}
              groceryData={groceryData}
              activityLogs={activityLogs}
              scrollTarget={scrollTarget}
              initialQuestion={initialQuestion}
              targetChatId={targetChatId}
              onScrollTargetClear={() => setScrollTarget(null)}
              onInitialQuestionClear={() => setInitialQuestion(null)}
              onTargetChatIdClear={() => setTargetChatId(null)}
              onSuggestionCountChange={refreshSuggestionCount}
              onPlaybookChange={refreshPlaybook}
              onActivityLogged={refreshActivityLogs}
              onProfileUpdate={handlePartialProfileUpdate}
              onNewInsight={handleNewInsight}
              onNavigateToChat={handleNavigateToChat}
            />
          )}

          {view === 'nutrition' && (
            <div className="flex-1 overflow-y-auto">
              <Nutrition
                profile={profile}
                playbook={playbook}
                onGroceryDataChange={setGroceryData}
                onPlaybookSuggestion={handleGrocerySuggestion}
                onSuggestionCountChange={refreshSuggestionCount}
                initialSection={navigateSection}
                onSectionClear={() => setNavigateSection(null)}
              />
            </div>
          )}

          {view === 'training' && (
            <TrainingPage onNavigate={handleNavigate} />
          )}

          {view === 'profile' && (
            <div className="flex-1 overflow-y-auto">
              <ProfileView
                profile={profile}
                onEditProfile={() => setEditingProfile(true)}
                onNavigateToChat={handleNavigateToChat}
              />
            </div>
          )}

          {view === 'learned' && (
            <div className="flex-1 overflow-y-auto">
              <LearnedInsightsPage
                onNavigateToChat={handleNavigateToChat}
                onBack={() => setView('profile')}
              />
            </div>
          )}

          {view === 'admin-feedback' && (
            <div className="flex-1 overflow-y-auto">
              <AdminFeedback onBack={() => setView('home')} />
            </div>
          )}

          {/* Check-in is now a modal overlay, not a view */}
        </div>

        {/* Bottom Navigation - hide on admin page */}
        {view !== 'admin-feedback' && (
          <BottomNav currentView={view} onNavigate={handleNavigate} />
        )}

        {/* Global Feedback Button */}
        <FeedbackButton
          currentPage={view}
          isOpenExternal={showFeedback}
          onClose={() => setShowFeedback(false)}
        />

        {/* Insight Notifications */}
        <InsightNotificationContainer
          notifications={insightNotifications}
          onDismiss={handleDismissInsightNotification}
          onViewProfile={() => setView('learned')}
        />

        {/* Sunday Check-In Reminder Modal */}
        {showSundayReminder && (
          <SundayReminderModal
            onCheckIn={handleSundayReminderCheckIn}
            onDismiss={handleSundayReminderDismiss}
            onSkipWeek={handleSundayReminderSkip}
            dismissCount={getDismissCount()}
          />
        )}

        {/* Weekly Check-In Modal */}
        {showCheckInModal && (
          <WeeklyCheckIn
            profile={profile}
            playbook={playbook}
            onCheckInComplete={handleCheckInComplete}
            onClose={handleCloseCheckIn}
            analyzingCheckIn={analyzingCheckIn}
          />
        )}

        {/* Profile Switcher Modal */}
        {showProfileSwitcher && (
          <ProfileSwitcherModal
            onClose={() => setShowProfileSwitcher(false)}
            onProfileChange={() => window.location.reload()}
          />
        )}

        {/* Dev Tools Modal */}
        {showDevTools && (
          <DevTools
            isModal={true}
            onClose={() => setShowDevTools(false)}
          />
        )}

        {/* Tutorial overlay */}
        {showTutorial && (
          <Tutorial onComplete={handleTutorialComplete} />
        )}
      </div>
    </ErrorBoundary>
  );
}

// Main App component with Auth wrapper
function App() {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
}

// Handles auth state and shows appropriate component
function AuthenticatedApp() {
  const { user, loading: authLoading } = useAuth();
  const [showIntro, setShowIntro] = useState(() => {
    // Check if user has seen the intro
    return !localStorage.getItem('health-advisor-intro-seen');
  });

  // Show loading spinner while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show pre-onboarding intro for first-time visitors (before auth)
  if (showIntro && !user) {
    return (
      <>
        <PreOnboardingIntro onComplete={() => setShowIntro(false)} />
        <FeedbackButton currentPage="intro" />
      </>
    );
  }

  // Show auth screen if not logged in
  if (!user) {
    return (
      <>
        <Auth />
        {/* DevTools available on auth screen for importing legacy data */}
        <DevTools />
        <FeedbackButton currentPage="auth" />
      </>
    );
  }

  // Show main app content if authenticated
  return <AppContent />;
}

export default App;
