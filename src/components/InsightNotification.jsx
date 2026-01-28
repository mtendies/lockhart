/**
 * InsightNotification - Toast notification when Advisor learns something new
 * Shows what was learned and allows quick action
 */

import { useState, useEffect } from 'react';
import { Sparkles, X, ChevronRight } from 'lucide-react';
import { CATEGORY_LABELS, CATEGORY_COLORS, INSIGHT_CATEGORIES } from '../learnedInsightsStore';

export default function InsightNotification({
  insight,
  onDismiss,
  onViewProfile,
  autoDismissMs = 8000,
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Animate in
    const showTimer = setTimeout(() => setIsVisible(true), 50);

    // Auto dismiss
    const dismissTimer = setTimeout(() => {
      handleDismiss();
    }, autoDismissMs);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(dismissTimer);
    };
  }, [autoDismissMs]);

  function handleDismiss() {
    setIsLeaving(true);
    setTimeout(() => {
      onDismiss();
    }, 200);
  }

  const colors = CATEGORY_COLORS[insight?.category] || CATEGORY_COLORS[INSIGHT_CATEGORIES.CONTEXT];
  const categoryLabel = CATEGORY_LABELS[insight?.category] || 'Context';

  return (
    <div
      className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-50 transition-all duration-200 ${
        isVisible && !isLeaving
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-4'
      }`}
    >
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 max-w-sm">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={`p-2 rounded-lg ${colors.bg}`}>
            <Sparkles size={16} className={colors.text} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">
              I've noted that about you
            </p>
            <p className="text-sm text-gray-600 mt-0.5">
              {insight?.text}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-xs px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
                {categoryLabel}
              </span>
              <button
                onClick={() => {
                  onViewProfile?.();
                  handleDismiss();
                }}
                className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-0.5"
              >
                View in profile
                <ChevronRight size={12} />
              </button>
            </div>
          </div>

          {/* Dismiss button */}
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 p-1 -mr-1 -mt-1"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * InsightNotificationContainer - Manages multiple notifications
 */
export function InsightNotificationContainer({
  notifications,
  onDismiss,
  onViewProfile,
}) {
  if (!notifications || notifications.length === 0) return null;

  // Only show the most recent notification
  const latest = notifications[notifications.length - 1];

  return (
    <InsightNotification
      key={latest.id}
      insight={latest}
      onDismiss={() => onDismiss(latest.id)}
      onViewProfile={onViewProfile}
    />
  );
}
