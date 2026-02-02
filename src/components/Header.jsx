import { useState, useRef, useEffect } from 'react';
import {
  User,
  ChevronDown,
  Edit3,
  Sparkles,
  Settings,
  Users,
  Wrench,
  Star,
  FlaskConical,
  LogOut,
  HelpCircle,
  MessageCircle,
  Download,
  Upload,
} from 'lucide-react';
import { getActiveProfile, getProfileColor } from '../profileStore';
import { useAuth } from '../context/AuthContext';
import { downloadBackup, parseBackupFile, restoreFromBackup } from '../lib/backupRestore';

export default function Header({
  onNavigateToProfile,
  onNavigateToLearnedInsights,
  onNavigateToSettings,
  onOpenProfileSwitcher,
  onOpenDevTools,
  onShowTutorial,
  onOpenFeedback,
}) {
  const { user, signOut } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [restoreStatus, setRestoreStatus] = useState(null); // null | 'selecting' | 'previewing' | 'restoring' | 'success' | 'error'
  const [backupPreview, setBackupPreview] = useState(null);
  const [restoreError, setRestoreError] = useState(null);
  const fileInputRef = useRef(null);
  const dropdownRef = useRef(null);
  const activeProfile = getActiveProfile();
  const profileColor = activeProfile ? getProfileColor(activeProfile.id) : null;
  const isTestProfile = activeProfile?.isTest === true;

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [dropdownOpen]);

  function handleMenuClick(action) {
    setDropdownOpen(false);
    action?.();
  }

  // Backup handlers
  function handleDownloadBackup() {
    setDropdownOpen(false);
    const result = downloadBackup();
    // Could show a toast notification here
    console.log('[Backup] Downloaded:', result.filename, result.summary);
  }

  function handleRestoreClick() {
    setDropdownOpen(false);
    setRestoreModalOpen(true);
    setRestoreStatus('selecting');
    setBackupPreview(null);
    setRestoreError(null);
  }

  async function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setRestoreStatus('previewing');
      const backup = await parseBackupFile(file);
      setBackupPreview(backup);
    } catch (err) {
      setRestoreError(err.message);
      setRestoreStatus('error');
    }
  }

  async function handleConfirmRestore() {
    if (!backupPreview) return;

    try {
      setRestoreStatus('restoring');
      const results = await restoreFromBackup(backupPreview, !!user);
      console.log('[Backup] Restore results:', results);
      setRestoreStatus('success');
      // Reload page after successful restore to apply changes
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      setRestoreError(err.message);
      setRestoreStatus('error');
    }
  }

  function closeRestoreModal() {
    setRestoreModalOpen(false);
    setRestoreStatus(null);
    setBackupPreview(null);
    setRestoreError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  return (
    <>
    <header className={`sticky top-0 z-40 backdrop-blur-sm border-b ${
      isTestProfile
        ? 'bg-violet-50/90 border-violet-200'
        : 'bg-white/90 border-gray-100'
    }`}>
      {/* Test Profile Banner */}
      {isTestProfile && (
        <div className="bg-violet-500 text-white text-center py-1 text-xs font-medium flex items-center justify-center gap-1">
          <FlaskConical size={12} />
          Test Mode: {activeProfile.name}
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-between h-12">
          {/* Left: App Logo/Name */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">L</span>
            </div>
            <span className="font-semibold text-gray-900 hidden sm:block">Lockhart</span>
          </div>

          {/* Right: Profile Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                profileColor
                  ? `${profileColor.bg} ${profileColor.text} hover:opacity-80`
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {activeProfile?.isTest ? (
                <FlaskConical size={16} />
              ) : (
                <User size={16} />
              )}
              <span className="text-sm font-medium truncate max-w-[120px]">
                {activeProfile?.name || 'Profile'}
              </span>
              {activeProfile?.isMain && !activeProfile?.isTest && (
                <Star size={12} className="opacity-60" />
              )}
              <ChevronDown
                size={14}
                className={`transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50 animate-fade-in">
                {/* Profile Header */}
                <div className="px-4 py-3 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full ${
                      profileColor ? `${profileColor.bg} ${profileColor.text}` : 'bg-gray-100 text-gray-600'
                    } flex items-center justify-center`}>
                      {activeProfile?.isTest ? <FlaskConical size={18} /> : <User size={18} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate flex items-center gap-1.5">
                        {activeProfile?.name || 'Profile'}
                        {activeProfile?.isMain && !activeProfile?.isTest && (
                          <Star size={12} className="text-amber-500" />
                        )}
                      </p>
                      <p className="text-xs text-gray-500">
                        {activeProfile?.isTest ? 'Test Profile' : activeProfile?.isMain ? 'Master Profile' : 'Profile'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Menu Items */}
                <div className="py-1">
                  <button
                    onClick={() => handleMenuClick(onNavigateToProfile)}
                    className="w-full px-4 py-2.5 flex items-center gap-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Edit3 size={16} className="text-gray-400" />
                    View/Edit Profile
                  </button>
                  <button
                    onClick={() => handleMenuClick(onNavigateToLearnedInsights)}
                    className="w-full px-4 py-2.5 flex items-center gap-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Sparkles size={16} className="text-gray-400" />
                    What I've Learned About You
                  </button>
                  {onShowTutorial && (
                    <button
                      onClick={() => handleMenuClick(onShowTutorial)}
                      className="w-full px-4 py-2.5 flex items-center gap-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <HelpCircle size={16} className="text-gray-400" />
                      Help & Tutorial
                    </button>
                  )}
                  <button
                    onClick={() => handleMenuClick(onOpenFeedback)}
                    className="w-full px-4 py-2.5 flex items-center gap-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <MessageCircle size={16} className="text-gray-400" />
                    Send Feedback
                  </button>
                </div>

                <div className="border-t border-gray-100 py-1">
                  <button
                    onClick={() => handleMenuClick(onOpenProfileSwitcher)}
                    className="w-full px-4 py-2.5 flex items-center justify-between text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Users size={16} className="text-gray-400" />
                      Switch Profile
                    </div>
                    <ChevronDown size={14} className="text-gray-400 -rotate-90" />
                  </button>
                </div>

                {/* Backup & Restore */}
                <div className="border-t border-gray-100 py-1">
                  <button
                    onClick={handleDownloadBackup}
                    className="w-full px-4 py-2.5 flex items-center gap-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Download size={16} className="text-gray-400" />
                    Download Backup
                  </button>
                  <button
                    onClick={handleRestoreClick}
                    className="w-full px-4 py-2.5 flex items-center gap-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Upload size={16} className="text-gray-400" />
                    Restore from Backup
                  </button>
                </div>

                {onOpenDevTools && (
                  <div className="border-t border-gray-100 py-1">
                    <button
                      onClick={() => {
                        console.log('Header: Dev Tools button clicked');
                        handleMenuClick(onOpenDevTools);
                      }}
                      className="w-full px-4 py-2.5 flex items-center gap-3 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
                    >
                      <Wrench size={16} className="text-gray-400" />
                      Dev Tools
                    </button>
                  </div>
                )}

                {/* Sign Out */}
                {user && (
                  <div className="border-t border-gray-100 py-1">
                    <div className="px-4 py-2 text-xs text-gray-400 truncate">
                      {user.email}
                    </div>
                    <button
                      onClick={() => handleMenuClick(signOut)}
                      className="w-full px-4 py-2.5 flex items-center gap-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut size={16} />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>

      {/* Restore Backup Modal */}
      {restoreModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Restore from Backup
            </h2>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
            />

            {restoreStatus === 'selecting' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Select a backup file to restore your data. This will replace your current data with the backup.
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-3 px-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-primary-400 hover:text-primary-600 transition-colors flex items-center justify-center gap-2"
                >
                  <Upload size={20} />
                  Choose Backup File
                </button>
              </div>
            )}

            {restoreStatus === 'previewing' && backupPreview && (
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <p className="text-sm font-medium text-gray-700">Backup Details:</p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>Profile: {backupPreview.summary?.profileName || 'Unknown'}</li>
                    <li>Chats: {backupPreview.summary?.chatCount || 0}</li>
                    <li>Activities: {backupPreview.summary?.activityCount || 0}</li>
                    <li>Insights: {backupPreview.summary?.insightCount || 0}</li>
                    <li>Created: {new Date(backupPreview.createdAt).toLocaleString()}</li>
                  </ul>
                </div>
                <p className="text-sm text-amber-600 bg-amber-50 rounded-lg p-3">
                  Warning: This will replace your current data. Make sure to download a backup first if needed.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={closeRestoreModal}
                    className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmRestore}
                    className="flex-1 py-2 px-4 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                  >
                    Restore Data
                  </button>
                </div>
              </div>
            )}

            {restoreStatus === 'restoring' && (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Restoring your data...</p>
              </div>
            )}

            {restoreStatus === 'success' && (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-gray-900 font-medium mb-2">Restore Complete!</p>
                <p className="text-sm text-gray-600">Reloading the app...</p>
              </div>
            )}

            {restoreStatus === 'error' && (
              <div className="space-y-4">
                <div className="bg-red-50 text-red-700 rounded-lg p-4 text-sm">
                  {restoreError || 'An error occurred during restore'}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={closeRestoreModal}
                    className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setRestoreStatus('selecting');
                      setRestoreError(null);
                    }}
                    className="flex-1 py-2 px-4 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            )}

            {/* Close button for selecting state */}
            {restoreStatus === 'selecting' && (
              <button
                onClick={closeRestoreModal}
                className="mt-4 w-full py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
