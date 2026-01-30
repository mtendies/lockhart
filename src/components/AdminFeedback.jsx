import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  MessageCircle,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Lightbulb,
  HelpCircle,
  MessageSquare,
  Check,
  X,
  Clock,
  Loader2,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

const ADMIN_EMAIL = 'tenderomaxwell@gmail.com';

const STATUS_OPTIONS = [
  { value: 'new', label: 'New', color: 'bg-blue-100 text-blue-700', icon: Clock },
  { value: 'reviewed', label: 'Reviewed', color: 'bg-yellow-100 text-yellow-700', icon: Check },
  { value: 'implemented', label: 'Implemented', color: 'bg-emerald-100 text-emerald-700', icon: Check },
  { value: 'wont_fix', label: "Won't Fix", color: 'bg-gray-100 text-gray-700', icon: X },
];

const CATEGORY_CONFIG = {
  bug: { label: 'Bug', icon: AlertCircle, color: 'text-red-600' },
  feature: { label: 'Feature idea', icon: Lightbulb, color: 'text-amber-600' },
  confusing: { label: 'Confusing', icon: HelpCircle, color: 'text-purple-600' },
  general: { label: 'General', icon: MessageSquare, color: 'text-gray-600' },
};

export default function AdminFeedback({ onBack }) {
  const { user } = useAuth();
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    status: 'all',
    category: 'all',
    search: '',
  });
  const [expandedId, setExpandedId] = useState(null);
  const [editingNotes, setEditingNotes] = useState({});

  // Check if user is admin
  const isAdmin = user?.email === ADMIN_EMAIL;

  useEffect(() => {
    if (isAdmin) {
      fetchFeedback();
    }
  }, [isAdmin]);

  async function fetchFeedback() {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('feedback')
        .select('*')
        .order('timestamp', { ascending: false });

      if (fetchError) throw fetchError;
      setFeedback(data || []);
    } catch (err) {
      console.error('Error fetching feedback:', err);
      setError('Failed to load feedback');
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id, newStatus) {
    try {
      const { error: updateError } = await supabase
        .from('feedback')
        .update({ status: newStatus })
        .eq('id', id);

      if (updateError) throw updateError;

      setFeedback(prev =>
        prev.map(f => (f.id === id ? { ...f, status: newStatus } : f))
      );
    } catch (err) {
      console.error('Error updating status:', err);
    }
  }

  async function updateNotes(id, notes) {
    try {
      const { error: updateError } = await supabase
        .from('feedback')
        .update({ admin_notes: notes })
        .eq('id', id);

      if (updateError) throw updateError;

      setFeedback(prev =>
        prev.map(f => (f.id === id ? { ...f, admin_notes: notes } : f))
      );
      setEditingNotes(prev => ({ ...prev, [id]: false }));
    } catch (err) {
      console.error('Error updating notes:', err);
    }
  }

  // Filter feedback
  const filteredFeedback = feedback.filter(f => {
    if (filters.status !== 'all' && f.status !== filters.status) return false;
    if (filters.category !== 'all' && f.category !== filters.category) return false;
    if (filters.search) {
      const search = filters.search.toLowerCase();
      const matchesFeedback = f.feedback?.toLowerCase().includes(search);
      const matchesEmail = f.user_email?.toLowerCase().includes(search);
      const matchesPage = f.page?.toLowerCase().includes(search);
      if (!matchesFeedback && !matchesEmail && !matchesPage) return false;
    }
    return true;
  });

  // Not admin - show access denied
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X size={32} className="text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">You don't have permission to view this page.</p>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <MessageCircle size={24} className="text-blue-600" />
                Feedback Dashboard
              </h1>
              <p className="text-sm text-gray-500">
                {filteredFeedback.length} of {feedback.length} items
              </p>
            </div>
            <button
              onClick={fetchFeedback}
              disabled={loading}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Status filter */}
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              {STATUS_OPTIONS.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>

            {/* Category filter */}
            <select
              value={filters.category}
              onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              {Object.entries(CATEGORY_CONFIG).map(([value, config]) => (
                <option key={value} value={value}>{config.label}</option>
              ))}
            </select>

            {/* Search */}
            <div className="flex-1 min-w-[200px] relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search feedback..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={32} className="animate-spin text-gray-400" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <AlertCircle size={48} className="mx-auto text-red-400 mb-4" />
            <p className="text-gray-600">{error}</p>
            <button
              onClick={fetchFeedback}
              className="mt-4 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : filteredFeedback.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No feedback found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredFeedback.map((item) => {
              const isExpanded = expandedId === item.id;
              const categoryConfig = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.general;
              const CategoryIcon = categoryConfig.icon;
              const statusConfig = STATUS_OPTIONS.find(s => s.value === item.status) || STATUS_OPTIONS[0];

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
                >
                  {/* Header */}
                  <div
                    className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  >
                    <div className="flex items-start gap-3">
                      {/* Status badge */}
                      <span className={`px-2 py-1 rounded-md text-xs font-medium ${statusConfig.color}`}>
                        {statusConfig.label}
                      </span>

                      {/* Category */}
                      <div className="flex items-center gap-1">
                        <CategoryIcon size={14} className={categoryConfig.color} />
                        <span className="text-xs text-gray-500">{categoryConfig.label}</span>
                      </div>

                      {/* Page */}
                      <span className="text-xs text-gray-400">
                        {item.page}
                      </span>

                      {/* Spacer */}
                      <div className="flex-1" />

                      {/* Expand icon */}
                      {isExpanded ? (
                        <ChevronUp size={18} className="text-gray-400" />
                      ) : (
                        <ChevronDown size={18} className="text-gray-400" />
                      )}
                    </div>

                    {/* Date and email */}
                    <div className="mt-2 text-xs text-gray-500">
                      {new Date(item.timestamp).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {item.user_email && (
                        <span className="ml-2">
                          · {item.user_email}
                        </span>
                      )}
                      {item.device && (
                        <span className="ml-2">
                          · {item.device}
                        </span>
                      )}
                    </div>

                    {/* Feedback preview */}
                    <p className={`mt-2 text-sm text-gray-700 ${!isExpanded ? 'line-clamp-2' : ''}`}>
                      "{item.feedback}"
                    </p>
                  </div>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-gray-100 pt-4 space-y-4">
                      {/* Status change */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-2">
                          Status
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {STATUS_OPTIONS.map((status) => (
                            <button
                              key={status.value}
                              onClick={() => updateStatus(item.id, status.value)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                item.status === status.value
                                  ? status.color + ' ring-2 ring-offset-1 ring-gray-300'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              {status.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Admin notes */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-2">
                          Admin Notes
                        </label>
                        {editingNotes[item.id] ? (
                          <div className="space-y-2">
                            <textarea
                              defaultValue={item.admin_notes || ''}
                              rows={3}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                              placeholder="Add internal notes..."
                              id={`notes-${item.id}`}
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  const textarea = document.getElementById(`notes-${item.id}`);
                                  updateNotes(item.id, textarea.value);
                                }}
                                className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingNotes(prev => ({ ...prev, [item.id]: false }))}
                                className="px-3 py-1.5 bg-gray-200 text-gray-700 text-xs rounded-lg hover:bg-gray-300 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div
                            onClick={() => setEditingNotes(prev => ({ ...prev, [item.id]: true }))}
                            className="px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors min-h-[60px]"
                          >
                            {item.admin_notes || (
                              <span className="text-gray-400 italic">Click to add notes...</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
