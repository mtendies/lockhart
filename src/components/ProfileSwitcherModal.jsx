import { useState, useEffect } from 'react';
import { X, User, Plus, Check, FlaskConical, Star, Settings } from 'lucide-react';
import {
  getProfiles,
  getActiveProfile,
  createProfile,
  switchProfile,
  getProfileColor,
} from '../profileStore';

export default function ProfileSwitcherModal({ onClose, onProfileChange }) {
  const [profiles, setProfiles] = useState([]);
  const [activeProfile, setActiveProfile] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [copyFromCurrent, setCopyFromCurrent] = useState(false);

  useEffect(() => {
    setProfiles(getProfiles());
    setActiveProfile(getActiveProfile());
  }, []);

  function handleSwitchProfile(profileId) {
    if (switchProfile(profileId)) {
      onClose();
      onProfileChange?.();
      window.location.reload();
    }
  }

  function handleCreateProfile(e) {
    e.preventDefault();
    if (newProfileName.trim()) {
      const newProfile = createProfile(newProfileName.trim(), copyFromCurrent);
      handleSwitchProfile(newProfile.id);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Switch Profile</h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Profile List */}
        <div className="flex-1 overflow-y-auto p-3">
          {profiles.map(profile => {
            const color = getProfileColor(profile.id);
            const isActive = profile.id === activeProfile?.id;

            return (
              <button
                key={profile.id}
                onClick={() => !isActive && handleSwitchProfile(profile.id)}
                disabled={isActive}
                className={`w-full p-3 flex items-center gap-3 rounded-xl transition-colors mb-2 ${
                  isActive
                    ? 'bg-primary-50 border border-primary-200'
                    : 'hover:bg-gray-50 border border-transparent'
                }`}
              >
                <div className={`w-10 h-10 rounded-full ${color.bg} ${color.text} flex items-center justify-center flex-shrink-0`}>
                  {profile.isTest ? <FlaskConical size={18} /> : <User size={18} />}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="font-medium text-gray-900 truncate flex items-center gap-2">
                    {profile.name}
                    {profile.isMain && !profile.isTest && (
                      <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                        <Star size={8} />
                        Main
                      </span>
                    )}
                    {profile.isTest && (
                      <span className="text-[10px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded">
                        Test
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500">
                    {profile.lastAccessedAt
                      ? `Last used ${formatRelativeTime(profile.lastAccessedAt)}`
                      : 'Never used'}
                  </p>
                </div>
                {isActive && (
                  <Check size={18} className="text-primary-600 flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Create New Profile */}
        <div className="border-t border-gray-100 p-4">
          {!showCreate ? (
            <button
              onClick={() => setShowCreate(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors font-medium"
            >
              <Plus size={18} />
              Create New Profile
            </button>
          ) : (
            <form onSubmit={handleCreateProfile} className="space-y-3">
              <input
                type="text"
                value={newProfileName}
                onChange={e => setNewProfileName(e.target.value)}
                placeholder="Profile name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                autoFocus
              />
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={copyFromCurrent}
                  onChange={e => setCopyFromCurrent(e.target.checked)}
                  className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                />
                Copy data from current profile
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newProfileName.trim()}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function formatRelativeTime(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
