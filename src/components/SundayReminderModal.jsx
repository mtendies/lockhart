import { ClipboardCheck, Clock, X } from 'lucide-react';

export default function SundayReminderModal({ onCheckIn, onDismiss, onSkipWeek, dismissCount = 0 }) {
  // Cannot be dismissed by clicking outside or pressing Escape
  // User must choose an action
  // After 2+ dismissals, show option to skip for the week

  const showSkipOption = dismissCount >= 2;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop - NOT clickable to dismiss */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 animate-scale-in">
        {/* NO close button - must choose an option */}

        {/* Content */}
        <div className="text-center">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ClipboardCheck size={32} className="text-indigo-600" />
          </div>

          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Weekly Check-in
          </h2>

          <div className="h-px bg-gray-200 my-4" />

          <p className="text-gray-600 mb-2">
            I've already summarized your week based on everything you logged. Just review, tweak if needed, and you're done.
          </p>

          <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-6">
            <Clock size={14} />
            <span>Usually takes ~2 minutes</span>
          </div>

          <div className="h-px bg-gray-200 mb-6" />

          <div className="flex gap-3">
            <button
              onClick={onDismiss}
              className="flex-1 py-3 px-4 text-gray-600 bg-gray-100 rounded-xl font-medium hover:bg-gray-200 transition-colors"
            >
              Remind Me Later
            </button>
            <button
              onClick={onCheckIn}
              className="flex-1 py-3 px-4 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
            >
              Let's Do It
            </button>
          </div>

          {/* Skip option appears after 2+ dismissals */}
          {showSkipOption && onSkipWeek && (
            <button
              onClick={onSkipWeek}
              className="mt-4 w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Skip this week's check-in
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
