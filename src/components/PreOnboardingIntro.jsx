import { useState } from 'react';
import { ChevronRight, ChevronLeft, Target, Lightbulb, MessageCircle, Dumbbell } from 'lucide-react';

const SCREENS = [
  {
    id: 'welcome',
    title: 'LOCKHART',
    subtitle: 'Your Personal Health Advisor',
    icon: Dumbbell,
    iconColor: 'text-primary-600',
    iconBg: 'bg-primary-100',
    content: null,
    buttonText: 'Get Started',
  },
  {
    id: 'who',
    title: 'WHO IS LOCKHART FOR?',
    icon: Target,
    iconColor: 'text-emerald-600',
    iconBg: 'bg-emerald-100',
    content: (
      <div className="space-y-4 text-left">
        <p className="text-gray-600">
          You already have a pretty good handle on your diet and fitness. You're not starting from zero.
        </p>
        <p className="text-gray-800 font-medium">
          But you want that extra edge.
        </p>
        <p className="text-gray-600">
          Lockhart is for people who want to <span className="font-semibold text-gray-800">OPTIMIZE</span> - not overhaul - their training and nutrition.
        </p>
        <div className="space-y-2 pt-2">
          <div className="flex items-center gap-2 text-gray-700">
            <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
              <svg className="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span>You work out regularly</span>
          </div>
          <div className="flex items-center gap-2 text-gray-700">
            <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
              <svg className="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span>You eat reasonably well</span>
          </div>
          <div className="flex items-center gap-2 text-gray-700">
            <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
              <svg className="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span>You want personalized guidance, not generic advice</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'why',
    title: 'WHY SPEND TIME HERE?',
    icon: Lightbulb,
    iconColor: 'text-amber-600',
    iconBg: 'bg-amber-100',
    content: (
      <div className="space-y-4 text-left">
        <p className="text-gray-600">
          Lockhart learns <span className="font-semibold text-gray-800">YOU</span> - your goals, your habits, your preferences - and gives you insights that actually matter.
        </p>
        <div className="space-y-3 pt-2">
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
            <h4 className="font-semibold text-gray-800 text-sm">OPTIMIZE YOUR TRAINING</h4>
            <p className="text-xs text-gray-600 mt-1">Track progress, get smarter recommendations</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
            <h4 className="font-semibold text-gray-800 text-sm">DIAL IN YOUR NUTRITION</h4>
            <p className="text-xs text-gray-600 mt-1">No calorie obsession - just mindful guidance</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
            <h4 className="font-semibold text-gray-800 text-sm">GET PERSONALIZED INSIGHTS</h4>
            <p className="text-xs text-gray-600 mt-1">An AI advisor that actually knows your context</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'feedback',
    title: 'HELP MAKE LOCKHART BETTER',
    icon: MessageCircle,
    iconColor: 'text-blue-600',
    iconBg: 'bg-blue-100',
    content: (
      <div className="space-y-4 text-left">
        <p className="text-gray-600">
          Lockhart is actively being improved based on feedback from people like you.
        </p>
        <p className="text-gray-600">
          You'll see a feedback button throughout the app. If something feels off, confusing, or you have an idea - let us know!
        </p>
        <p className="text-gray-800 font-medium">
          Your input directly shapes what gets built next.
        </p>
        <div className="mt-4 p-3 bg-blue-50 rounded-xl border border-blue-200 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <MessageCircle size={16} className="text-white" />
          </div>
          <span className="text-sm text-blue-800">
            You'll see this <span className="font-semibold">Feedback</span> button
          </span>
        </div>
      </div>
    ),
    buttonText: "Let's Go!",
  },
];

export default function PreOnboardingIntro({ onComplete }) {
  const [currentScreen, setCurrentScreen] = useState(0);
  const [touchStart, setTouchStart] = useState(null);

  const screen = SCREENS[currentScreen];
  const isFirst = currentScreen === 0;
  const isLast = currentScreen === SCREENS.length - 1;
  const Icon = screen.icon;

  function handleNext() {
    if (isLast) {
      // Mark intro as seen and complete
      localStorage.setItem('health-advisor-intro-seen', 'true');
      onComplete();
    } else {
      setCurrentScreen(prev => prev + 1);
    }
  }

  function handlePrev() {
    if (!isFirst) {
      setCurrentScreen(prev => prev - 1);
    }
  }

  function handleSkip() {
    localStorage.setItem('health-advisor-intro-seen', 'true');
    onComplete();
  }

  // Touch handlers for swipe
  function handleTouchStart(e) {
    setTouchStart(e.touches[0].clientX);
  }

  function handleTouchEnd(e) {
    if (!touchStart) return;
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;

    if (Math.abs(diff) > 50) {
      if (diff > 0 && !isLast) {
        // Swipe left - next
        setCurrentScreen(prev => prev + 1);
      } else if (diff < 0 && !isFirst) {
        // Swipe right - prev
        setCurrentScreen(prev => prev - 1);
      }
    }
    setTouchStart(null);
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-emerald-50 flex flex-col"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Skip button */}
      <div className="p-4 flex justify-end">
        <button
          onClick={handleSkip}
          className="text-sm text-gray-500 hover:text-gray-700 font-medium"
        >
          Skip
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
        {/* Icon */}
        <div className={`w-20 h-20 ${screen.iconBg} rounded-2xl flex items-center justify-center mb-6 shadow-sm`}>
          <Icon size={40} className={screen.iconColor} />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
          {screen.title}
        </h1>

        {/* Subtitle (for welcome screen) */}
        {screen.subtitle && (
          <p className="text-gray-600 text-center mb-8">{screen.subtitle}</p>
        )}

        {/* Content */}
        {screen.content && (
          <div className="max-w-sm w-full mt-4 mb-8">
            {screen.content}
          </div>
        )}

        {/* Navigation arrows for desktop */}
        <div className="flex items-center gap-4 mt-auto mb-6">
          <button
            onClick={handlePrev}
            disabled={isFirst}
            className={`p-3 rounded-full ${
              isFirst
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <ChevronLeft size={24} />
          </button>

          {/* Progress dots */}
          <div className="flex items-center gap-2">
            {SCREENS.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentScreen(index)}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  index === currentScreen
                    ? 'bg-primary-600 w-6'
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            disabled={false}
            className="p-3 rounded-full text-gray-600 hover:bg-gray-100"
          >
            <ChevronRight size={24} />
          </button>
        </div>

        {/* Primary button (shown on first and last screens) */}
        {(isFirst || isLast) && (
          <button
            onClick={handleNext}
            className="w-full max-w-xs py-3 px-6 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 transition-colors flex items-center justify-center gap-2 shadow-lg"
          >
            {screen.buttonText || 'Continue'}
            <ChevronRight size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
