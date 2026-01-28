/**
 * AdvisorAdditionIndicator
 * Shows a small indicator when content was added by the Advisor
 * On click, reveals details and approve/remove buttons
 */

import { useState, useRef, useEffect } from 'react';
import { Sparkles, Check, X, Bot } from 'lucide-react';

export default function AdvisorAdditionIndicator({
  addedContent,
  reason,
  onApprove,
  onRemove,
  size = 'small', // 'small' | 'medium'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const popoverRef = useRef(null);

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  function handleApprove() {
    setIsApproved(true);
    setIsOpen(false);
    onApprove?.();
  }

  function handleRemove() {
    setIsOpen(false);
    onRemove?.();
  }

  // After approval, show a subtle checkmark briefly then fade
  if (isApproved) {
    return (
      <span className="inline-flex items-center text-emerald-500 animate-fade-out">
        <Check size={12} />
      </span>
    );
  }

  const iconSize = size === 'small' ? 12 : 14;

  return (
    <span className="relative inline-block" ref={popoverRef}>
      {/* Indicator button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center justify-center rounded-full transition-colors ${
          size === 'small'
            ? 'w-4 h-4 text-[10px]'
            : 'w-5 h-5 text-xs'
        } ${
          isOpen
            ? 'bg-primary-500 text-white'
            : 'bg-primary-100 text-primary-600 hover:bg-primary-200'
        }`}
        title="Added by Advisor - click for details"
      >
        <Sparkles size={iconSize} />
      </button>

      {/* Popover */}
      {isOpen && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 p-3 animate-fade-in">
          {/* Arrow */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-r border-b border-gray-200 transform rotate-45" />

          {/* Content */}
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1 bg-primary-100 rounded">
                <Bot size={12} className="text-primary-600" />
              </div>
              <span className="text-xs font-medium text-gray-500">Added by Advisor</span>
            </div>

            <p className="text-sm text-gray-800 mb-2">
              "{addedContent}"
            </p>

            {reason && (
              <p className="text-xs text-gray-500 mb-3">
                {reason}
              </p>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleApprove}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-emerald-500 text-white text-xs font-medium rounded-lg hover:bg-emerald-600 transition-colors"
              >
                <Check size={12} />
                Keep
              </button>
              <button
                onClick={handleRemove}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-gray-200 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-300 transition-colors"
              >
                <X size={12} />
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </span>
  );
}

/**
 * Inline version that wraps content with the indicator
 */
export function AdvisorAddedContent({
  children,
  addedContent,
  reason,
  onApprove,
  onRemove,
  showIndicator = true,
}) {
  if (!showIndicator) {
    return children;
  }

  return (
    <span className="inline-flex items-center gap-1">
      {children}
      <AdvisorAdditionIndicator
        addedContent={addedContent}
        reason={reason}
        onApprove={onApprove}
        onRemove={onRemove}
      />
    </span>
  );
}
