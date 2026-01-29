import { useState, useEffect } from 'react';
import { X, User, Plus, Check, FlaskConical, Star, Settings, Crown, Trash2, AlertTriangle } from 'lucide-react';
import {
  getProfiles,
  getActiveProfile,
  createProfile,
  switchProfile,
  deleteProfile,
  setMainProfile,
  getProfileColor,
} from '../profileStore';

export default function ProfileSwitcherModal({ onClose, onProfileChange }) {
  const [profiles, setProfiles] = useState([]);
  const [activeProfile, setActiveProfile] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [copyFromCurrent, setCopyFromCurrent] = useState(false);
  const [confirmMasterChange, setConfirmMasterChange] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showManageOptions, setShowManageOptions] = useState(null);

  useEffect(() => {
    setProfiles(getProfiles());
    setActiveProfile(getActiveProfile());
  }, []);

  function refreshProfiles() {
    setProfiles(getProfiles());
    setActiveProfile(getActiveProfile());
  }

  function handleSetAsMaster(profile) {
    setConfirmMasterChange(profile);
    setShowManageOptions(null);
  }

  function confirmSetAsMaster() {
    if (confirmMasterChange) {
      setMainProfile(confirmMasterChange.id);
      refreshProfiles();
      setConfirmMasterChange(null);
    }
  }

  function handleDeleteProfile(profile) {
    setConfirmDelete(profile);
    setShowManageOptions(null);
  }

  function confirmDeleteProfile() {
    if (confirmDelete) {
      if (deleteProfile(confirmDelete.id)) {
        refreshProfiles();
        // If we deleted the active profile, page will reload automatically
        if (confirmDelete.id === activeProfile?.id) {
          window.location.reload();
        }
      }
      setConfirmDelete(null);
    }
  }

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
            const showOptions = showManageOptions === profile.id;

            return (
              <div key={profile.id} className="relative mb-2">
                <div
                  className={`w-full p-3 flex items-center gap-3 rounded-xl transition-colors ${
                    isActive
                      ? 'bg-primary-50 border border-primary-200'
                      : 'hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  <button
                    onClick={() => !isActive && handleSwitchProfile(profile.id)}
                    disabled={isActive}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
                  >
                    <div className={`w-10 h-10 rounded-full ${color.bg} ${color.text} flex items-center justify-center flex-shrink-0`}>
                      {profile.isTest ? <FlaskConical size={18} /> : profile.isMain ? <Crown size={18} /> : <User size={18} />}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-medium text-gray-900 truncate flex items-center gap-2">
                        {profile.name}
                        {profile.isMain && !profile.isTest && (
                          <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            <Star size={8} className="fill-amber-500" />
                            Master
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

                  {/* Manage button */}
                  {!profile.isTest && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowManageOptions(showOptions ? null : profile.id);
                      }}
                      className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors flex-shrink-0"
                      title="Manage profile"
                    >
                      <Settings size={16} className="text-gray-400" />
                    </button>
                  )}
                </div>

                {/* Manage options dropdown */}
                {showOptions && !profile.isTest && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowManageOptions(null)}
                    />
                    <div className="absolute right-2 top-full mt-1 z-20 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[160px]">
                      {!profile.isMain && (
                        <button
                          onClick={() => handleSetAsMaster(profile)}
                          className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-amber-50 hover:text-amber-700 transition-colors flex items-center gap-2"
                        >
                          <Crown size={14} />
                          Set as Master
                        </button>
                      )}
                      {!profile.isMain && (
                        <button
                          onClick={() => handleDeleteProfile(profile)}
                          className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                        >
                          <Trash2 size={14} />
                          Delete Profile
                        </button>
                      )}
                      {profile.isMain && (
                        <div className="px-3 py-2 text-xs text-gray-400">
                          Master profile is protected
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
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

      {/* Confirmation Modal: Set as Master */}
      {confirmMasterChange && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[110] p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-amber-100 rounded-full mx-auto mb-4">
              <Crown size={24} className="text-amber-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
              Set as Master Profile?
            </h3>
            <p className="text-sm text-gray-600 text-center mb-6">
              This will make <strong>"{confirmMasterChange.name}"</strong> your Master profile.
              The Master profile is protected from deletion and serves as your primary profile.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmMasterChange(null)}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmSetAsMaster}
                className="flex-1 px-4 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium flex items-center justify-center gap-2"
              >
                <Crown size={16} />
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Delete Profile */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[110] p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
              <AlertTriangle size={24} className="text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
              Delete Profile?
            </h3>
            <p className="text-sm text-gray-600 text-center mb-6">
              Are you sure you want to delete <strong>"{confirmDelete.name}"</strong>?
              All data associated with this profile will be permanently deleted.
              This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteProfile}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium flex items-center justify-center gap-2"
              >
                <Trash2 size={16} />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
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
