import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { User, ChevronDown, Plus, Settings, Check, Trash2, Edit3, X, Shield, FlaskConical, Star } from 'lucide-react';
import {
  getProfiles,
  getActiveProfile,
  createProfile,
  switchProfile,
  deleteProfile,
  renameProfile,
  setMainProfile,
  getProfileColor,
  getMainProfile,
} from '../profileStore';

export default function ProfileSwitcher({ onProfileChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [profiles, setProfiles] = useState([]);
  const [activeProfile, setActiveProfile] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    loadProfiles();
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function loadProfiles() {
    setProfiles(getProfiles());
    setActiveProfile(getActiveProfile());
  }

  function handleSwitchProfile(profileId) {
    if (switchProfile(profileId)) {
      setIsOpen(false);
      onProfileChange?.();
      // Reload the page to load new profile's data
      window.location.reload();
    }
  }

  function handleCreateProfile(name, copyFromCurrent) {
    const newProfile = createProfile(name, copyFromCurrent);
    setShowCreateModal(false);
    // Switch to the new profile
    handleSwitchProfile(newProfile.id);
  }

  function handleDeleteProfile(profileId) {
    const profile = profiles.find(p => p.id === profileId);
    if (profile?.isMain) {
      // Master profile cannot be deleted
      alert('The Master profile cannot be deleted. To delete this profile, first set another profile as Master.');
      return;
    }

    if (deleteProfile(profileId)) {
      loadProfiles();
      setDeleteConfirm(null);
      // If deleted active profile, page will reload via the deleteProfile function
      if (profileId === activeProfile?.id) {
        window.location.reload();
      }
    }
  }

  function handleRenameProfile(profileId, newName) {
    if (renameProfile(profileId, newName)) {
      loadProfiles();
      setEditingProfile(null);
    }
  }

  function handleSetMainProfile(profileId) {
    setMainProfile(profileId);
    loadProfiles();
  }

  const profileColor = activeProfile ? getProfileColor(activeProfile.id) : null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Profile Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
          profileColor ? `${profileColor.bg} ${profileColor.text} hover:opacity-80` : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        {activeProfile?.isTest ? (
          <FlaskConical size={14} />
        ) : (
          <User size={14} />
        )}
        <span className="text-xs font-medium truncate max-w-[100px]">
          {activeProfile?.name || 'Profile'}
        </span>
        {activeProfile?.isMain && !activeProfile?.isTest && (
          <Star size={10} className="opacity-60" />
        )}
        <ChevronDown size={12} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-[60]">
          <div className="px-3 py-2 border-b border-gray-100">
            <p className="text-xs font-medium text-gray-500">Switch Profile</p>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {/* Show Return to Master button if in test profile */}
            {activeProfile?.isTest && (
              <>
                {(() => {
                  const mainProfile = getMainProfile();
                  if (mainProfile) {
                    const mainColor = getProfileColor(mainProfile.id);
                    return (
                      <button
                        onClick={() => handleSwitchProfile(mainProfile.id)}
                        className="w-full px-3 py-2 flex items-center gap-3 bg-amber-50 hover:bg-amber-100 transition-colors border-b border-amber-100"
                      >
                        <div className={`w-8 h-8 rounded-full ${mainColor.bg} ${mainColor.text} flex items-center justify-center`}>
                          <Star size={14} />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-medium text-amber-800 flex items-center gap-1">
                            {mainProfile.name}
                            <span className="text-[10px] bg-amber-200 text-amber-700 px-1 rounded">Master</span>
                          </p>
                          <p className="text-xs text-amber-600">Return to your real profile</p>
                        </div>
                        <Shield size={16} className="text-amber-600" />
                      </button>
                    );
                  }
                  return null;
                })()}
              </>
            )}

            {/* Regular profiles */}
            {profiles.map(profile => {
              const color = getProfileColor(profile.id);
              const isActive = profile.id === activeProfile?.id;

              return (
                <button
                  key={profile.id}
                  onClick={() => !isActive && handleSwitchProfile(profile.id)}
                  className={`w-full px-3 py-2 flex items-center gap-3 hover:bg-gray-50 transition-colors ${
                    isActive ? 'bg-gray-50' : ''
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full ${color.bg} ${color.text} flex items-center justify-center`}>
                    {profile.isTest ? <FlaskConical size={14} /> : <User size={14} />}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate flex items-center gap-1">
                      {profile.name}
                      {profile.isMain && !profile.isTest && (
                        <span className="text-[10px] bg-amber-100 text-amber-700 px-1 rounded">Master</span>
                      )}
                      {profile.isTest && (
                        <span className="text-[10px] bg-violet-100 text-violet-700 px-1 rounded">Test</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400">
                      {profile.lastAccessedAt
                        ? `Last used ${formatRelativeTime(profile.lastAccessedAt)}`
                        : 'Never used'}
                    </p>
                  </div>
                  {isActive && (
                    <Check size={16} className="text-primary-600 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="border-t border-gray-100 pt-2 mt-2">
            <button
              onClick={() => {
                setIsOpen(false);
                setShowCreateModal(true);
              }}
              className="w-full px-3 py-2 flex items-center gap-2 text-sm text-primary-600 hover:bg-primary-50 transition-colors"
            >
              <Plus size={16} />
              Create New Profile
            </button>
            <button
              onClick={() => {
                setIsOpen(false);
                setShowManageModal(true);
              }}
              className="w-full px-3 py-2 flex items-center gap-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Settings size={16} />
              Manage Profiles
            </button>
          </div>
        </div>
      )}

      {/* Create Profile Modal - rendered via portal */}
      {showCreateModal && createPortal(
        <CreateProfileModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateProfile}
        />,
        document.body
      )}

      {/* Manage Profiles Modal - rendered via portal */}
      {showManageModal && createPortal(
        <ManageProfilesModal
          profiles={profiles}
          activeProfileId={activeProfile?.id}
          editingProfile={editingProfile}
          deleteConfirm={deleteConfirm}
          onClose={() => {
            setShowManageModal(false);
            setEditingProfile(null);
            setDeleteConfirm(null);
          }}
          onEdit={setEditingProfile}
          onRename={handleRenameProfile}
          onDelete={handleDeleteProfile}
          onSetMain={handleSetMainProfile}
          onConfirmDelete={setDeleteConfirm}
          onSwitch={handleSwitchProfile}
        />,
        document.body
      )}
    </div>
  );
}

function CreateProfileModal({ onClose, onCreate }) {
  const [name, setName] = useState('');
  const [copyFromCurrent, setCopyFromCurrent] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    if (name.trim()) {
      onCreate(name.trim(), copyFromCurrent);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Create New Profile</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Profile Name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Test User - Level 1"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              autoFocus
            />
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <input
              type="checkbox"
              id="copyFromCurrent"
              checked={copyFromCurrent}
              onChange={e => setCopyFromCurrent(e.target.checked)}
              className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
            />
            <label htmlFor="copyFromCurrent" className="text-sm text-gray-700">
              Copy data from current profile
            </label>
          </div>

          <p className="text-xs text-gray-500">
            {copyFromCurrent
              ? "The new profile will start with a copy of your current profile's data."
              : "The new profile will start fresh with no data. You'll go through onboarding."}
          </p>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ManageProfilesModal({
  profiles,
  activeProfileId,
  editingProfile,
  deleteConfirm,
  onClose,
  onEdit,
  onRename,
  onDelete,
  onSetMain,
  onConfirmDelete,
  onSwitch,
}) {
  const [editName, setEditName] = useState('');

  function startEditing(profile) {
    setEditName(profile.name);
    onEdit(profile.id);
  }

  function handleRename(profileId) {
    if (editName.trim()) {
      onRename(profileId, editName.trim());
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Manage Profiles</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 space-y-3">
          {profiles.map(profile => {
            const color = getProfileColor(profile.id);
            const isActive = profile.id === activeProfileId;
            const isEditing = editingProfile === profile.id;
            const isDeleting = deleteConfirm === profile.id;

            return (
              <div
                key={profile.id}
                className={`p-4 rounded-xl border ${
                  isActive ? 'border-primary-300 bg-primary-50/50' : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full ${color.bg} ${color.text} flex items-center justify-center`}>
                    <User size={18} />
                  </div>

                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-primary-500"
                          autoFocus
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleRename(profile.id);
                            if (e.key === 'Escape') onEdit(null);
                          }}
                        />
                        <button
                          onClick={() => handleRename(profile.id)}
                          className="p-1 text-primary-600 hover:bg-primary-100 rounded"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => onEdit(null)}
                          className="p-1 text-gray-400 hover:bg-gray-100 rounded"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm font-medium text-gray-900 flex items-center gap-2 flex-wrap">
                          {profile.name}
                          {profile.isMain && !profile.isTest && (
                            <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded flex items-center gap-1">
                              <Star size={10} />
                              Master
                            </span>
                          )}
                          {profile.isTest && (
                            <span className="text-[10px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded flex items-center gap-1">
                              <FlaskConical size={10} />
                              Test
                            </span>
                          )}
                          {isActive && (
                            <span className="text-[10px] bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded">
                              Active
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-400">
                          Created {formatRelativeTime(profile.createdAt)}
                        </p>
                      </>
                    )}
                  </div>

                  {!isEditing && !isDeleting && (
                    <div className="flex items-center gap-1">
                      {!isActive && (
                        <button
                          onClick={() => onSwitch(profile.id)}
                          className="px-2 py-1 text-xs text-primary-600 hover:bg-primary-50 rounded"
                        >
                          Switch
                        </button>
                      )}
                      <button
                        onClick={() => startEditing(profile)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                        title="Rename"
                      >
                        <Edit3 size={14} />
                      </button>
                      {!profile.isMain && !profile.isTest && (
                        <button
                          onClick={() => onSetMain(profile.id)}
                          className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded"
                          title="Set as Master"
                        >
                          <Shield size={14} />
                        </button>
                      )}
                      {profiles.length > 1 && !profile.isMain && (
                        <button
                          onClick={() => onConfirmDelete(profile.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Delete Confirmation */}
                {isDeleting && (
                  <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-sm text-red-800 mb-2">
                      {profile.isMain
                        ? 'The Master profile cannot be deleted.'
                        : `Delete "${profile.name}"? This cannot be undone.`}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => onConfirmDelete(null)}
                        className="px-3 py-1 text-xs text-gray-600 hover:bg-white rounded border border-gray-300"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => onDelete(profile.id)}
                        className="px-3 py-1 text-xs text-white bg-red-600 hover:bg-red-700 rounded"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="pt-4 border-t border-gray-100 mt-4">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Done
          </button>
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
