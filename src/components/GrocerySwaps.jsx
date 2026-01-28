import { useState } from 'react';
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  Filter,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Star,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import {
  getSwapsForDisplay,
  getSwapStats,
  getUsedCategories,
  updateSwapStatus,
  updateSwap,
  rateSwap,
  deleteSwap,
  logSwap,
  detectCategory,
  parseSwapFromText,
  activatePendingSwap,
  getPendingSwaps,
  SWAP_STATUS,
  SWAP_SOURCES,
  CATEGORY_LABELS,
} from '../swapStore';

const STATUS_CONFIG = {
  [SWAP_STATUS.PENDING]: {
    label: 'Pending',
    color: 'bg-sky-50 text-sky-700 border-sky-200',
    icon: Search,
    description: 'Considering this swap',
  },
  [SWAP_STATUS.ACTIVE]: {
    label: 'Active',
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    icon: Check,
    description: 'Still using this swap',
  },
  [SWAP_STATUS.REVERTED]: {
    label: 'Reverted',
    color: 'bg-red-50 text-red-700 border-red-200',
    icon: RotateCcw,
    description: 'Went back to original',
  },
  [SWAP_STATUS.TRIED]: {
    label: 'Tried',
    color: 'bg-gray-100 text-gray-600 border-gray-200',
    icon: Zap,
    description: 'Tested but moved on',
  },
};

export default function GrocerySwaps({ onSwapsChange }) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedSwap, setExpandedSwap] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Edit state
  const [editingSwap, setEditingSwap] = useState(null);
  const [editForm, setEditForm] = useState({
    originalProduct: '',
    newProduct: '',
    reason: '',
    status: '',
  });

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Add form state
  const [newSwap, setNewSwap] = useState({
    originalProduct: '',
    newProduct: '',
    reason: '',
    category: '',
  });
  const [quickInput, setQuickInput] = useState('');

  const swaps = getSwapsForDisplay(statusFilter, categoryFilter);
  const stats = getSwapStats();
  const usedCategories = getUsedCategories();
  const pendingSwaps = getPendingSwaps();

  // Force refresh helper
  const refresh = () => {
    setRefreshKey(k => k + 1);
    onSwapsChange?.();
  };

  // Filter by search
  const filteredSwaps = searchQuery
    ? swaps.filter(s =>
        s.originalProduct.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.newProduct.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.reason?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : swaps;

  function handleStatusChange(swapId, newStatus) {
    updateSwapStatus(swapId, newStatus);
    refresh();
  }

  function handleActivatePending(swapId) {
    activatePendingSwap(swapId);
    refresh();
  }

  function handleRating(swapId, rating) {
    rateSwap(swapId, rating);
    refresh();
  }

  function handleDelete(swapId) {
    deleteSwap(swapId);
    setDeleteConfirm(null);
    refresh();
  }

  // Start editing a swap
  function startEditing(swap) {
    setEditingSwap(swap.id);
    setEditForm({
      originalProduct: swap.originalProduct,
      newProduct: swap.newProduct,
      reason: swap.reason || '',
      status: swap.status,
    });
    setExpandedSwap(null); // Close expanded view when editing
  }

  // Cancel editing
  function cancelEditing() {
    setEditingSwap(null);
    setEditForm({ originalProduct: '', newProduct: '', reason: '', status: '' });
  }

  // Save edited swap
  function saveEditing(swapId) {
    if (!editForm.originalProduct.trim() || !editForm.newProduct.trim()) return;

    updateSwap(swapId, {
      originalProduct: editForm.originalProduct.trim(),
      newProduct: editForm.newProduct.trim(),
      reason: editForm.reason.trim(),
      status: editForm.status,
    });
    cancelEditing();
    refresh();
  }

  function handleQuickAdd() {
    if (!quickInput.trim()) return;

    const parsed = parseSwapFromText(quickInput);
    if (parsed) {
      const category = detectCategory(parsed.originalProduct) || detectCategory(parsed.newProduct);
      logSwap({
        ...parsed,
        category,
        source: SWAP_SOURCES.MANUAL,
      });
      setQuickInput('');
      setShowAddForm(false);
      refresh();
    } else {
      // Show detailed form if parsing fails
      setShowAddForm(true);
    }
  }

  function handleDetailedAdd() {
    if (!newSwap.originalProduct || !newSwap.newProduct) return;

    const category = newSwap.category || detectCategory(newSwap.originalProduct) || detectCategory(newSwap.newProduct);
    logSwap({
      ...newSwap,
      category,
      source: SWAP_SOURCES.MANUAL,
    });
    setNewSwap({ originalProduct: '', newProduct: '', reason: '', category: '' });
    setShowAddForm(false);
    refresh();
  }

  function formatDate(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (24 * 60 * 60 * 1000));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 14) return '1 week ago';
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  return (
    <div className="space-y-4">
      {/* Header with Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
            <ArrowRight size={16} className="text-violet-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">My Swaps</h3>
            <p className="text-xs text-gray-500">
              {stats.active} active{stats.pending > 0 ? `, ${stats.pending} pending` : ''}{stats.total > stats.active + stats.pending ? `, ${stats.total - stats.active - stats.pending} past` : ''}
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-violet-600 bg-violet-50 hover:bg-violet-100 rounded-lg transition-colors"
        >
          <Plus size={14} />
          Log Swap
        </button>
      </div>

      {/* Quick Stats */}
      {stats.total > 0 && (
        <div className={`grid gap-2 ${stats.pending > 0 ? 'grid-cols-3' : 'grid-cols-2'}`}>
          {stats.pending > 0 && (
            <div className="bg-sky-50 rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-sky-700">{stats.pending}</p>
              <p className="text-xs text-sky-600">Pending</p>
            </div>
          )}
          <div className="bg-emerald-50 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-emerald-700">{stats.active}</p>
            <p className="text-xs text-emerald-600">Active</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-gray-700">{stats.total}</p>
            <p className="text-xs text-gray-600">Total</p>
          </div>
        </div>
      )}

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-violet-50 rounded-xl border border-violet-100 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-violet-800">Log a new swap</p>
            <button onClick={() => setShowAddForm(false)} className="text-violet-400 hover:text-violet-600">
              <X size={16} />
            </button>
          </div>

          {/* Quick input */}
          <div>
            <input
              type="text"
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleQuickAdd()}
              placeholder='Try: "Switched from Cheerios to Catalina Crunch for more protein"'
              className="w-full px-3 py-2 text-sm bg-white border border-violet-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <p className="text-xs text-violet-600 mt-1">Or fill in the details below</p>
          </div>

          {/* Detailed form */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              value={newSwap.originalProduct}
              onChange={(e) => setNewSwap({ ...newSwap, originalProduct: e.target.value })}
              placeholder="Original product"
              className="px-3 py-2 text-sm bg-white border border-violet-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <input
              type="text"
              value={newSwap.newProduct}
              onChange={(e) => setNewSwap({ ...newSwap, newProduct: e.target.value })}
              placeholder="New product"
              className="px-3 py-2 text-sm bg-white border border-violet-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <input
            type="text"
            value={newSwap.reason}
            onChange={(e) => setNewSwap({ ...newSwap, reason: e.target.value })}
            placeholder="Why? (e.g., more protein, less sugar)"
            className="w-full px-3 py-2 text-sm bg-white border border-violet-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <select
            value={newSwap.category}
            onChange={(e) => setNewSwap({ ...newSwap, category: e.target.value })}
            className="w-full px-3 py-2 text-sm bg-white border border-violet-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="">Auto-detect category</option>
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <button
            onClick={handleDetailedAdd}
            disabled={!newSwap.originalProduct || !newSwap.newProduct}
            className="w-full py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Add Swap
          </button>
        </div>
      )}

      {/* Filters */}
      {stats.total > 0 && (
        <div className="space-y-2">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search swaps..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
          >
            <Filter size={12} />
            Filters
            {showFilters ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {(statusFilter !== 'all' || categoryFilter) && (
              <span className="px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded-full text-[10px]">
                {[statusFilter !== 'all' && STATUS_CONFIG[statusFilter]?.label, categoryFilter && CATEGORY_LABELS[categoryFilter]].filter(Boolean).join(', ')}
              </span>
            )}
          </button>

          {showFilters && (
            <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
              {/* Status filter */}
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-2 py-1 text-xs rounded-full transition-colors ${
                    statusFilter === 'all'
                      ? 'bg-gray-800 text-white'
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  All
                </button>
                {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-2 py-1 text-xs rounded-full transition-colors ${
                      statusFilter === status
                        ? 'bg-gray-800 text-white'
                        : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {config.label}
                  </button>
                ))}
              </div>

              {/* Category filter */}
              {usedCategories.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <button
                    onClick={() => setCategoryFilter(null)}
                    className={`px-2 py-1 text-xs rounded-full transition-colors ${
                      !categoryFilter
                        ? 'bg-violet-600 text-white'
                        : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    All categories
                  </button>
                  {usedCategories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={`px-2 py-1 text-xs rounded-full transition-colors ${
                        categoryFilter === cat
                          ? 'bg-violet-600 text-white'
                          : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {CATEGORY_LABELS[cat] || cat}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Swaps List */}
      {filteredSwaps.length === 0 ? (
        <div className="text-center py-8">
          {stats.total === 0 ? (
            <>
              <div className="w-12 h-12 bg-violet-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <ArrowRight size={20} className="text-violet-400" />
              </div>
              <p className="text-sm text-gray-600 mb-1">No swaps logged yet</p>
              <p className="text-xs text-gray-500">
                Track your healthier grocery choices here
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-500">No swaps match your filters</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredSwaps.map(swap => {
            const statusConfig = STATUS_CONFIG[swap.status];
            const StatusIcon = statusConfig.icon;
            const isExpanded = expandedSwap === swap.id;
            const isEditing = editingSwap === swap.id;
            const isPending = swap.status === SWAP_STATUS.PENDING;
            const isActive = swap.status === SWAP_STATUS.ACTIVE;
            const showDeleteConfirm = deleteConfirm === swap.id;

            // Edit mode
            if (isEditing) {
              return (
                <div
                  key={swap.id}
                  className="rounded-xl border-2 border-violet-300 bg-violet-50 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-violet-800">Edit Swap</p>
                    <button
                      onClick={cancelEditing}
                      className="text-violet-400 hover:text-violet-600"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* Original product */}
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Original product</label>
                    <input
                      type="text"
                      value={editForm.originalProduct}
                      onChange={(e) => setEditForm({ ...editForm, originalProduct: e.target.value })}
                      placeholder="What you used to buy"
                      className="w-full px-3 py-2 text-sm bg-white border border-violet-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>

                  {/* New product */}
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Swapped to</label>
                    <input
                      type="text"
                      value={editForm.newProduct}
                      onChange={(e) => setEditForm({ ...editForm, newProduct: e.target.value })}
                      placeholder="What you buy now"
                      className="w-full px-3 py-2 text-sm bg-white border border-violet-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>

                  {/* Reason */}
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Why</label>
                    <input
                      type="text"
                      value={editForm.reason}
                      onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
                      placeholder="e.g., more protein, less sugar"
                      className="w-full px-3 py-2 text-sm bg-white border border-violet-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>

                  {/* Status dropdown */}
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Status</label>
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-white border border-violet-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                    >
                      {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                        <option key={status} value={status}>{config.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Save / Cancel buttons */}
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => saveEditing(swap.id)}
                      disabled={!editForm.originalProduct.trim() || !editForm.newProduct.trim()}
                      className="flex-1 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1"
                    >
                      <Check size={14} />
                      Save
                    </button>
                    <button
                      onClick={cancelEditing}
                      className="flex-1 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={swap.id}
                className={`rounded-xl border p-3 transition-colors ${
                  isPending
                    ? 'bg-sky-50/50 border-sky-200 border-l-4 border-l-sky-400'
                    : isActive
                    ? 'bg-white border-emerald-200'
                    : 'bg-white border-gray-200'
                }`}
              >
                {/* Delete confirmation overlay */}
                {showDeleteConfirm && (
                  <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700 mb-2">Remove this swap?</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDelete(swap.id)}
                        className="flex-1 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Yes, remove
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="flex-1 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        No, keep it
                      </button>
                    </div>
                  </div>
                )}

                {/* Main row */}
                <div className="flex items-start gap-3">
                  {/* Status indicator */}
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                    isPending
                      ? 'bg-sky-100 text-sky-600'
                      : isActive
                      ? 'bg-emerald-100 text-emerald-600'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    <StatusIcon size={12} />
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Products */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm text-gray-500 line-through">{swap.originalProduct}</span>
                      <ArrowRight size={12} className="text-violet-500 shrink-0" />
                      <span className={`text-sm font-medium ${
                        isPending ? 'text-sky-700' : isActive ? 'text-emerald-700' : 'text-gray-700'
                      }`}>
                        {swap.newProduct}
                      </span>
                    </div>

                    {/* Reason */}
                    {swap.reason && (
                      <p className="text-xs text-gray-500 mt-1">{swap.reason}</p>
                    )}

                    {/* Meta row */}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusConfig.color}`}>
                        {statusConfig.label}
                      </span>
                      {swap.category && (
                        <span className="text-[10px] px-2 py-0.5 bg-violet-50 text-violet-600 rounded-full">
                          {CATEGORY_LABELS[swap.category] || swap.category}
                        </span>
                      )}
                      {swap.purchaseCount > 0 && (
                        <span className="text-[10px] text-gray-500">
                          Purchased {swap.purchaseCount}x
                        </span>
                      )}
                      <span className="text-[10px] text-gray-400">{formatDate(swap.date)}</span>
                    </div>

                    {/* Quick action for pending swaps */}
                    {isPending && (
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => handleActivatePending(swap.id)}
                          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors"
                        >
                          <Check size={12} />
                          I made this swap
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(swap.id)}
                          className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <X size={12} />
                          Not interested
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1">
                    {/* Edit button */}
                    <button
                      onClick={() => startEditing(swap)}
                      className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                      title="Edit swap"
                    >
                      <Pencil size={14} />
                    </button>
                    {/* Delete button */}
                    <button
                      onClick={() => setDeleteConfirm(swap.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete swap"
                    >
                      <Trash2 size={14} />
                    </button>
                    {/* Expand button */}
                    <button
                      onClick={() => setExpandedSwap(isExpanded ? null : swap.id)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
                      title="More options"
                    >
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
                    {/* Status change */}
                    <div>
                      <p className="text-xs text-gray-500 mb-2">Update status:</p>
                      <div className="flex gap-2">
                        {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                          <button
                            key={status}
                            onClick={() => handleStatusChange(swap.id, status)}
                            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                              swap.status === status
                                ? config.color + ' border'
                                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                            }`}
                          >
                            {config.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Rating */}
                    <div>
                      <p className="text-xs text-gray-500 mb-2">How do you like it?</p>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(star => (
                          <button
                            key={star}
                            onClick={() => handleRating(swap.id, star)}
                            className={`p-1 rounded transition-colors ${
                              swap.rating >= star
                                ? 'text-amber-400'
                                : 'text-gray-300 hover:text-amber-300'
                            }`}
                          >
                            <Star size={20} fill={swap.rating >= star ? 'currentColor' : 'none'} />
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Source info */}
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>
                        Source: {swap.source === SWAP_SOURCES.ADVISOR ? 'Advisor suggestion' :
                                swap.source === SWAP_SOURCES.GROCERY ? 'Grocery upload' :
                                swap.source === SWAP_SOURCES.CHAT ? 'Chat' : 'Manual entry'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Active swaps celebration */}
      {stats.active >= 3 && (
        <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-3 flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
            <Sparkles size={16} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-emerald-800">
              {stats.active} healthy swaps going strong!
            </p>
            <p className="text-xs text-emerald-600">
              You're making consistent healthier choices
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
