/**
 * LearnedInsights - Display and manage insights the Advisor has learned
 * Shows categorized insights with source links and edit/delete functionality
 */

import { useState } from 'react';
import {
  Trash2,
  Edit3,
  ExternalLink,
  Check,
  X,
  Heart,
  Briefcase,
  Settings,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  getLearnedInsights,
  getInsightsByCategory,
  updateLearnedInsight,
  deleteLearnedInsight,
  INSIGHT_CATEGORIES,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
} from '../learnedInsightsStore';

const CATEGORY_ICONS = {
  [INSIGHT_CATEGORIES.HEALTH]: Heart,
  [INSIGHT_CATEGORIES.LIFESTYLE]: Briefcase,
  [INSIGHT_CATEGORIES.PREFERENCE]: Settings,
  [INSIGHT_CATEGORIES.CONTEXT]: Info,
};

export default function LearnedInsights({
  compact = false,
  maxItems,
  onNavigateToChat,
  onInsightChange,
}) {
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [expandedCategories, setExpandedCategories] = useState({
    [INSIGHT_CATEGORIES.HEALTH]: true,
    [INSIGHT_CATEGORIES.LIFESTYLE]: true,
    [INSIGHT_CATEGORIES.PREFERENCE]: true,
    [INSIGHT_CATEGORIES.CONTEXT]: true,
  });

  const insights = getLearnedInsights();
  const groupedInsights = getInsightsByCategory();

  if (insights.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-gray-500">
          No insights yet. As you chat with your Advisor, I'll learn more about you!
        </p>
      </div>
    );
  }

  // For compact view, show flat list
  if (compact) {
    const displayInsights = maxItems ? insights.slice(0, maxItems) : insights;

    return (
      <div className="space-y-2">
        {displayInsights.map((insight) => (
          <InsightItem
            key={insight.id}
            insight={insight}
            compact={true}
            isEditing={editingId === insight.id}
            editText={editText}
            onEdit={() => {
              setEditingId(insight.id);
              setEditText(insight.text);
            }}
            onEditChange={setEditText}
            onSaveEdit={() => handleSaveEdit(insight.id)}
            onCancelEdit={() => setEditingId(null)}
            onDelete={() => handleDelete(insight.id)}
            onViewSource={() => handleViewSource(insight)}
          />
        ))}
        {maxItems && insights.length > maxItems && (
          <p className="text-xs text-gray-400 pt-1">
            +{insights.length - maxItems} more insights
          </p>
        )}
      </div>
    );
  }

  // Full view with categories
  return (
    <div className="space-y-4">
      {Object.entries(groupedInsights).map(([category, categoryInsights]) => {
        if (categoryInsights.length === 0) return null;

        const Icon = CATEGORY_ICONS[category];
        const colors = CATEGORY_COLORS[category];
        const isExpanded = expandedCategories[category];

        return (
          <div key={category} className={`rounded-xl border ${colors.border} overflow-hidden`}>
            <button
              onClick={() => setExpandedCategories(prev => ({
                ...prev,
                [category]: !prev[category],
              }))}
              className={`w-full flex items-center justify-between px-4 py-3 ${colors.bg} hover:opacity-90 transition-opacity`}
            >
              <div className="flex items-center gap-2">
                <Icon size={16} className={colors.text} />
                <span className={`font-medium ${colors.text}`}>
                  {CATEGORY_LABELS[category]}
                </span>
                <span className="text-xs text-gray-500">
                  ({categoryInsights.length})
                </span>
              </div>
              {isExpanded ? (
                <ChevronUp size={16} className="text-gray-400" />
              ) : (
                <ChevronDown size={16} className="text-gray-400" />
              )}
            </button>

            {isExpanded && (
              <div className="bg-white p-3 space-y-2">
                {categoryInsights.map((insight) => (
                  <InsightItem
                    key={insight.id}
                    insight={insight}
                    isEditing={editingId === insight.id}
                    editText={editText}
                    onEdit={() => {
                      setEditingId(insight.id);
                      setEditText(insight.text);
                    }}
                    onEditChange={setEditText}
                    onSaveEdit={() => handleSaveEdit(insight.id)}
                    onCancelEdit={() => setEditingId(null)}
                    onDelete={() => handleDelete(insight.id)}
                    onViewSource={() => handleViewSource(insight)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  function handleSaveEdit(id) {
    if (editText.trim()) {
      updateLearnedInsight(id, { text: editText.trim() });
      onInsightChange?.();
    }
    setEditingId(null);
    setEditText('');
  }

  function handleDelete(id) {
    deleteLearnedInsight(id);
    onInsightChange?.();
  }

  function handleViewSource(insight) {
    if (insight.chatId && insight.messageIndex !== undefined) {
      onNavigateToChat?.(insight.chatId, insight.messageIndex);
    }
  }
}

// Individual insight item component
function InsightItem({
  insight,
  compact = false,
  isEditing,
  editText,
  onEdit,
  onEditChange,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onViewSource,
}) {
  const colors = CATEGORY_COLORS[insight.category] || CATEGORY_COLORS[INSIGHT_CATEGORIES.CONTEXT];
  const dateStr = new Date(insight.dateAdded).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
        <input
          type="text"
          value={editText}
          onChange={(e) => onEditChange(e.target.value)}
          className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:border-primary-400 focus:ring-1 focus:ring-primary-200 outline-none"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSaveEdit();
            if (e.key === 'Escape') onCancelEdit();
          }}
        />
        <button
          onClick={onSaveEdit}
          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
          title="Save"
        >
          <Check size={14} />
        </button>
        <button
          onClick={onCancelEdit}
          className="p-1.5 text-gray-400 hover:bg-gray-100 rounded transition-colors"
          title="Cancel"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="group flex items-start gap-2 py-1.5 px-2 hover:bg-gray-50 rounded-lg transition-colors">
      {/* Category indicator (compact view) */}
      {compact && (
        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${colors.bg} ${colors.border} border`} />
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-700">{insight.text}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-gray-400">Added {dateStr}</span>
          {insight.chatId && (
            <button
              onClick={onViewSource}
              className="flex items-center gap-0.5 text-xs text-primary-500 hover:text-primary-600"
            >
              <ExternalLink size={10} />
              View source
            </button>
          )}
        </div>
      </div>

      {/* Actions (shown on hover) */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onEdit}
          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
          title="Edit"
        >
          <Edit3 size={12} />
        </button>
        <button
          onClick={onDelete}
          className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
          title="Delete"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}
