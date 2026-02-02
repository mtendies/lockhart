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
} from 'lucide-react';
import { getActiveProfile, getProfileColor } from '../profileStore';
import { useAuth } from '../context/AuthContext';

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

  return (
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
  );
}
