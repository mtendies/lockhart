/**
 * AdvisorClarifyPopup
 * Shows clarifying questions when the Advisor needs user input
 * Used for: meal placement, overwrite approval, uncertain categorization
 */

import { useState } from 'react';
import { HelpCircle, Check, X, Sparkles } from 'lucide-react';

/**
 * Question types:
 * - mealPlacement: Where to add a nutrition entry
 * - overwriteApproval: Approve replacing existing content
 * - general: Any other clarifying question
 */

export default function AdvisorClarifyPopup({
  type = 'general',
  title = 'Quick question!',
  description,
  options = [],
  existingContent = null,
  newContent = null,
  onSelect,
  onDismiss,
}) {
  const [selectedOption, setSelectedOption] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  function handleConfirm() {
    if (selectedOption !== null) {
      onSelect(selectedOption);
      setShowConfirmation(true);

      // Auto-hide after showing confirmation
      setTimeout(() => {
        setShowConfirmation(false);
      }, 3000);
    }
  }

  if (showConfirmation) {
    return (
      <div className="mt-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 rounded-lg">
            <Check size={16} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-emerald-800">Got it!</p>
            <p className="text-xs text-emerald-600">I'll remember this for next time.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 p-4 rounded-xl bg-blue-50 border border-blue-200 animate-fade-in">
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="p-2 bg-blue-100 rounded-lg shrink-0">
          <HelpCircle size={16} className="text-blue-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-blue-800">{title}</p>
          {description && (
            <p className="text-xs text-blue-600 mt-0.5">{description}</p>
          )}
        </div>
        <button
          onClick={onDismiss}
          className="p-1 text-blue-400 hover:text-blue-600 rounded"
          title="Dismiss"
        >
          <X size={16} />
        </button>
      </div>

      {/* Show existing content if this is an overwrite question */}
      {existingContent && (
        <div className="mb-3 p-2 bg-white/60 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">Currently logged:</p>
          <p className="text-sm text-gray-700">"{existingContent}"</p>
        </div>
      )}

      {/* Show new content being added */}
      {newContent && (
        <div className="mb-3 p-2 bg-blue-100/50 rounded-lg">
          <p className="text-xs text-blue-600 mb-1">To add:</p>
          <p className="text-sm text-blue-800">"{newContent}"</p>
        </div>
      )}

      {/* Options */}
      <div className="space-y-2 mb-3">
        {options.map((option, idx) => (
          <button
            key={idx}
            onClick={() => setSelectedOption(option.value)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
              selectedOption === option.value
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-700 hover:bg-blue-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                selectedOption === option.value
                  ? 'border-white bg-white'
                  : 'border-gray-300'
              }`}>
                {selectedOption === option.value && (
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                )}
              </div>
              <span>{option.label}</span>
            </div>
            {option.description && (
              <p className={`text-xs mt-0.5 ml-6 ${
                selectedOption === option.value ? 'text-blue-100' : 'text-gray-500'
              }`}>
                {option.description}
              </p>
            )}
          </button>
        ))}
      </div>

      {/* Confirm button */}
      <button
        onClick={handleConfirm}
        disabled={selectedOption === null}
        className="w-full py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Confirm
      </button>
    </div>
  );
}

/**
 * Meal Placement Popup - specialized for nutrition entries
 */
export function MealPlacementPopup({
  content,
  availableMeals = [],
  existingMeals = {},
  onSelect,
  onDismiss,
}) {
  const options = availableMeals.map(meal => {
    const hasExisting = existingMeals[meal.id]?.trim();
    return {
      value: { action: hasExisting ? 'append' : 'add', mealId: meal.id, mealType: meal.type },
      label: hasExisting ? `Add to ${meal.label}` : meal.label,
      description: hasExisting ? `Currently: "${existingMeals[meal.id].substring(0, 40)}${existingMeals[meal.id].length > 40 ? '...' : ''}"` : 'Empty',
    };
  });

  // Add "don't add" option
  options.push({
    value: { action: 'skip' },
    label: "Don't add to nutrition profile",
    description: "Just log to Focus Goal",
  });

  return (
    <AdvisorClarifyPopup
      type="mealPlacement"
      title="Where should I add this?"
      description={`Would you like me to add "${content}" to your nutrition profile?`}
      newContent={content}
      options={options}
      onSelect={onSelect}
      onDismiss={onDismiss}
    />
  );
}

/**
 * Overwrite Approval Popup - when replacing existing content
 */
export function OverwriteApprovalPopup({
  existingContent,
  newContent,
  mealLabel,
  onSelect,
  onDismiss,
}) {
  const options = [
    {
      value: 'append',
      label: `Add to existing ${mealLabel}`,
      description: `Will become: "${existingContent}, ${newContent}"`,
    },
    {
      value: 'replace',
      label: `Replace ${mealLabel}`,
      description: `Will become: "${newContent}"`,
    },
    {
      value: 'skip',
      label: "Don't add to nutrition profile",
      description: "Just log to Focus Goal",
    },
  ];

  return (
    <AdvisorClarifyPopup
      type="overwriteApproval"
      title={`Update ${mealLabel}?`}
      description={`I see you already logged ${mealLabel.toLowerCase()}.`}
      existingContent={existingContent}
      newContent={newContent}
      options={options}
      onSelect={onSelect}
      onDismiss={onDismiss}
    />
  );
}
