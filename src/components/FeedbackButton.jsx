import { useState, useEffect } from 'react';
import { MessageCircle, X, Send, CheckCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const CATEGORIES = [
  { value: 'bug', label: 'Bug / Something broken' },
  { value: 'feature', label: 'Feature idea' },
  { value: 'confusing', label: 'Confusing / Hard to use' },
  { value: 'general', label: 'General feedback' },
];

// Map view names to display names
const PAGE_NAMES = {
  'home': 'Home',
  'advisor': 'Advisor',
  'nutrition': 'Nutrition',
  'training': 'Training',
  'profile': 'Profile',
  'learned': 'Learned Insights',
  'auth': 'Sign In',
  'onboarding': 'Onboarding',
  'intro': 'Introduction',
};

export default function FeedbackButton({ currentPage = 'home', isOpenExternal = false, onClose = null }) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(isOpenExternal);
  const [feedback, setFeedback] = useState('');
  const [category, setCategory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState(null);

  // Sync with external open state
  useEffect(() => {
    setIsOpen(isOpenExternal);
  }, [isOpenExternal]);

  const pageName = PAGE_NAMES[currentPage] || currentPage;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!feedback.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Detect device type
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const device = isMobile ? 'mobile' : 'desktop';

      const feedbackData = {
        user_id: user?.id || null,
        user_email: user?.email || null,
        page: pageName,
        category: category || null,
        feedback: feedback.trim(),
        device,
        app_version: '1.0.0',
      };

      const { error: submitError } = await supabase
        .from('feedback')
        .insert([feedbackData]);

      if (submitError) throw submitError;

      setIsSubmitted(true);
      setFeedback('');
      setCategory('');

      // Auto-close after showing success
      setTimeout(() => {
        setIsOpen(false);
        setIsSubmitted(false);
      }, 2000);
    } catch (err) {
      console.error('Error submitting feedback:', err);
      setError('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleClose() {
    setIsOpen(false);
    setFeedback('');
    setCategory('');
    setError(null);
    setIsSubmitted(false);
    if (onClose) onClose();
  }

  return (
    <>
      {/* Floating Feedback Button - Hidden on mobile to avoid blocking UI */}
      <button
        onClick={() => setIsOpen(true)}
        className="hidden md:flex fixed bottom-20 left-4 z-40 items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 hover:scale-105 transition-all group"
        title="Share feedback"
      >
        <MessageCircle size={18} />
        <span className="text-sm font-medium hidden sm:inline group-hover:inline">Feedback</span>
      </button>

      {/* Feedback Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={handleClose}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            {isSubmitted ? (
              // Success state
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={32} className="text-emerald-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Thanks!</h3>
                <p className="text-gray-600">
                  Your feedback has been submitted. It helps make Lockhart better for everyone.
                </p>
                <button
                  onClick={handleClose}
                  className="mt-6 px-6 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
                >
                  Close
                </button>
              </div>
            ) : (
              // Form state
              <>
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <MessageCircle size={20} className="text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Share Feedback</h3>
                  </div>
                  <button
                    onClick={handleClose}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                  {/* Feedback text */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      What's on your mind?
                    </label>
                    <textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="Type your feedback here..."
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                      required
                    />
                  </div>

                  {/* Category selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category (optional)
                    </label>
                    <div className="space-y-2">
                      {CATEGORIES.map((cat) => (
                        <label
                          key={cat.value}
                          className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                            category === cat.value
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="category"
                            value={cat.value}
                            checked={category === cat.value}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">{cat.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Page info */}
                  <div className="text-xs text-gray-500">
                    Page: <span className="font-medium">{pageName}</span>
                  </div>

                  {/* Error message */}
                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                      {error}
                    </div>
                  )}

                  {/* Submit button */}
                  <button
                    type="submit"
                    disabled={!feedback.trim() || isSubmitting}
                    className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <>
                        <Send size={18} />
                        Submit Feedback
                      </>
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
