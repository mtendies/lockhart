import { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, MessageCircle, Bookmark, CalendarCheck, ClipboardList, ShoppingCart, Loader2, Menu, X, FlaskConical, HelpCircle, User } from 'lucide-react';
import ProfileSwitcher from './ProfileSwitcher';
import { getActiveProfile } from '../profileStore';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'playbook', label: 'Playbook', icon: ClipboardList },
  { id: 'nutrition', label: 'Nutrition', icon: ShoppingCart },
  { id: 'chat', label: 'Advisor', icon: MessageCircle },
  { id: 'checkin', label: 'Check-In', icon: CalendarCheck },
  { id: 'bookmarks', label: 'Bookmarks', icon: Bookmark },
  { id: 'profile', label: 'Profile', icon: User },
];

export default function NavBar({ currentView, onNavigate, pendingSuggestionCount = 0, analyzingProfile = false, onProfileChange, onShowTutorial }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMobileMenuOpen(false);
      }
    }
    if (mobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [mobileMenuOpen]);

  // Close menu on navigation
  function handleNavigate(id) {
    onNavigate(id);
    setMobileMenuOpen(false);
  }

  const currentItem = NAV_ITEMS.find(item => item.id === currentView);
  const CurrentIcon = currentItem?.icon || LayoutDashboard;
  const activeProfile = getActiveProfile();
  const isTestProfile = activeProfile?.isTest === true;

  return (
    <div className={`backdrop-blur-sm border-b sticky top-0 z-50 ${
      isTestProfile
        ? 'bg-violet-50/80 border-violet-100'
        : 'bg-white/80 border-gray-100'
    }`}>
      {/* Test Profile Banner */}
      {isTestProfile && (
        <div className="bg-violet-500 text-white text-center py-1 text-xs font-medium flex items-center justify-center gap-1">
          <FlaskConical size={12} />
          Test Mode: {activeProfile.name}
        </div>
      )}
      <div className="max-w-3xl mx-auto px-4">
        <div className="flex items-center justify-between py-2 gap-2">
          {/* Left: Profile Switcher */}
          <div className="flex-shrink-0">
            <ProfileSwitcher onProfileChange={onProfileChange} />
          </div>

          {/* Center: Nav Items - Desktop */}
          <nav className="hidden sm:flex items-center justify-center flex-1">
            {NAV_ITEMS.map(item => {
              const Icon = item.icon;
              const active = currentView === item.id;
              const showBadge = item.id === 'playbook' && pendingSuggestionCount > 0;
              const showAnalyzing = item.id === 'playbook' && analyzingProfile;

              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`relative flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-colors ${
                    active
                      ? 'text-primary-600'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <div className="relative">
                    <Icon size={16} strokeWidth={active ? 2.5 : 2} />
                    {showAnalyzing && (
                      <div className="absolute -top-1 -right-1">
                        <Loader2 size={10} className="text-amber-500 animate-spin" />
                      </div>
                    )}
                    {!showAnalyzing && showBadge && (
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-amber-400 rounded-full border-2 border-white" />
                    )}
                  </div>
                  <span className={`text-[11px] ${active ? 'font-semibold' : 'font-medium'}`}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* Center: Current page + hamburger - Mobile */}
          <div className="flex sm:hidden items-center gap-2 flex-1 justify-center" ref={menuRef}>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <CurrentIcon size={18} className="text-primary-600" />
              <span className="text-sm font-medium text-gray-800">{currentItem?.label || 'Menu'}</span>
              {mobileMenuOpen ? (
                <X size={18} className="text-gray-500" />
              ) : (
                <Menu size={18} className="text-gray-500" />
              )}
            </button>

            {/* Mobile dropdown menu */}
            {mobileMenuOpen && (
              <div className="absolute top-full left-0 right-0 bg-white border-b border-gray-200 shadow-lg animate-fade-in">
                <div className="max-w-3xl mx-auto px-4 py-2">
                  <div className="grid grid-cols-3 gap-2">
                    {NAV_ITEMS.map(item => {
                      const Icon = item.icon;
                      const active = currentView === item.id;
                      const showBadge = item.id === 'playbook' && pendingSuggestionCount > 0;
                      const showAnalyzing = item.id === 'playbook' && analyzingProfile;

                      return (
                        <button
                          key={item.id}
                          onClick={() => handleNavigate(item.id)}
                          className={`relative flex flex-col items-center gap-1 px-3 py-3 rounded-xl transition-colors ${
                            active
                              ? 'bg-primary-50 text-primary-600'
                              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                          }`}
                        >
                          <div className="relative">
                            <Icon size={22} strokeWidth={active ? 2.5 : 2} />
                            {showAnalyzing && (
                              <div className="absolute -top-1 -right-1">
                                <Loader2 size={12} className="text-amber-500 animate-spin" />
                              </div>
                            )}
                            {!showAnalyzing && showBadge && (
                              <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full border-2 border-white" />
                            )}
                          </div>
                          <span className={`text-xs ${active ? 'font-semibold' : 'font-medium'}`}>
                            {item.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {/* View Tutorial option */}
                  {onShowTutorial && (
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onShowTutorial();
                      }}
                      className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-gray-700 border-t border-gray-100"
                    >
                      <HelpCircle size={16} />
                      <span className="text-xs font-medium">View Tutorial</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right: Help button */}
          <div className="flex-shrink-0 flex justify-end">
            {onShowTutorial && (
              <button
                onClick={onShowTutorial}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
                title="View Tutorial"
              >
                <HelpCircle size={16} />
                <span className="text-xs font-medium">Help</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
