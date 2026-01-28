import { useEffect } from 'react';
import { ArrowLeft, Sparkles } from 'lucide-react';
import LearnedInsights from './LearnedInsights';

export default function LearnedInsightsPage({ onNavigateToChat, onBack }) {
  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="bg-gray-50/50 pb-8">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header with back button */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={onBack}
            className="p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div className="flex items-center gap-2">
            <Sparkles size={20} className="text-amber-600" />
            <h1 className="text-xl font-bold text-gray-900">What I've Learned About You</h1>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 mb-6">
          As you chat with your Advisor, I learn about your health journey, preferences, and circumstances.
          This helps me provide more personalized recommendations.
        </p>

        {/* Learned Insights - Full View */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <LearnedInsights
            compact={false}
            onNavigateToChat={onNavigateToChat}
          />
        </div>
      </div>
    </div>
  );
}
