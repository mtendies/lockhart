/**
 * Tutorial - Post-onboarding swipeable tutorial
 * Mobile-first, engaging, and skippable
 */

import { useState, useRef, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  PartyPopper,
  Smartphone,
  ClipboardList,
  MessageCircle,
  Salad,
  Link2,
  Calendar,
  Zap,
  Lightbulb,
  Rocket
} from 'lucide-react';

const TUTORIAL_SCREENS = [
  {
    id: 'welcome',
    icon: PartyPopper,
    iconColor: 'text-amber-500',
    iconBg: 'bg-amber-50',
    title: 'Welcome to Lockhart!',
    content: "Let's take 60 seconds to show you how to get the most out of this.",
    cta: "Let's Go",
  },
  {
    id: 'dashboard',
    icon: Smartphone,
    iconColor: 'text-blue-500',
    iconBg: 'bg-blue-50',
    title: 'The Dashboard',
    tagline: 'Your quick-capture home base.',
    content: 'Log meals, workouts, or anything in seconds. Just type and send.',
    visual: 'quick-entry',
  },
  {
    id: 'playbook',
    icon: ClipboardList,
    iconColor: 'text-emerald-500',
    iconBg: 'bg-emerald-50',
    title: 'My Playbook',
    subtitle: 'Your personalized game plan:',
    bullets: [
      'Weekly Wins',
      'Focus Goals',
      'Key Principles',
    ],
    tagline: 'This is your strategy HQ.',
  },
  {
    id: 'advisor',
    icon: MessageCircle,
    iconColor: 'text-violet-500',
    iconBg: 'bg-violet-50',
    title: 'The Advisor',
    subtitle: 'Ask anything about nutrition, fitness, or your goals.',
    examples: [
      '"Should I eat more protein?"',
      '"What\'s a good post-run meal?"',
    ],
    tagline: 'Your personal health advisor, 24/7.',
  },
  {
    id: 'nutrition',
    icon: Salad,
    iconColor: 'text-green-500',
    iconBg: 'bg-green-50',
    title: 'Nutrition',
    content: 'Upload grocery receipts for smart swap suggestions.',
    bullets: [
      'Complete your Nutrition Profile to unlock personalized insights.',
    ],
    tagline: 'No calorie counting required.',
  },
  {
    id: 'connected',
    icon: Link2,
    iconColor: 'text-primary-500',
    iconBg: 'bg-primary-50',
    title: 'Everything Is Connected',
    example: 'Tell the Advisor "I ran 3 miles" and your Focus Goals update.',
    highlight: 'Dashboard → Playbook → Check-in',
    tagline: 'Log once. Updates everywhere.',
  },
  {
    id: 'first-week',
    icon: Calendar,
    iconColor: 'text-orange-500',
    iconBg: 'bg-orange-50',
    title: 'Your First Week',
    tagline: 'Three priorities. That\'s it.',
    taglinePosition: 'top',
    numbered: [
      { title: 'Complete your Nutrition Profile', desc: 'Log meals for 5 days' },
      { title: 'Log quick entries daily', desc: 'Takes 10 seconds!' },
      { title: 'Do your Sunday Check-in', desc: 'Review your week' },
    ],
  },
  {
    id: 'daily-habit',
    icon: Zap,
    iconColor: 'text-yellow-500',
    iconBg: 'bg-yellow-50',
    title: 'Your Daily Habit',
    tagline: '10 seconds. That\'s all it takes.',
    taglinePosition: 'top',
    content: 'Open the app → Log one thing',
    examples: [
      '"Had eggs for breakfast"',
      '"Ran 2 miles"',
      '"Slept great last night"',
    ],
    footer: "The Advisor handles the rest.",
  },
  {
    id: 'pro-tips',
    icon: Lightbulb,
    iconColor: 'text-amber-500',
    iconBg: 'bg-amber-50',
    title: 'Pro Tips',
    tagline: 'Be specific. Ask anything. Check weekly.',
    taglinePosition: 'top',
    tips: [
      { text: '"Ran 3 miles at 9:30 pace"', detail: 'beats "went running"' },
      { text: 'The Advisor knows your profile', detail: '— ask it anything' },
      { text: 'Your Playbook evolves', detail: '— check it weekly' },
    ],
  },
  {
    id: 'ready',
    icon: Rocket,
    iconColor: 'text-primary-500',
    iconBg: 'bg-primary-50',
    title: "You're All Set!",
    content: 'Your Advisor is ready when you are.',
    subtitle: 'Start by logging your first meal or workout on the Dashboard.',
    cta: 'Go to Dashboard',
    ctaIcon: true,
    footnote: 'You can revisit this tutorial anytime from Help.',
  },
];

// Tagline component - subtle but memorable emphasis
function Tagline({ text }) {
  return (
    <p className="my-3 text-center text-primary-600 font-semibold text-base sm:text-lg">
      {text}
    </p>
  );
}

export default function Tutorial({ onComplete }) {
  const [currentScreen, setCurrentScreen] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [slideDirection, setSlideDirection] = useState(null);
  const containerRef = useRef(null);

  const minSwipeDistance = 50;

  // Handle keyboard navigation
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'ArrowRight') {
        goNext();
      } else if (e.key === 'ArrowLeft') {
        goPrev();
      } else if (e.key === 'Escape') {
        onComplete();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentScreen]);

  function goNext() {
    if (isAnimating) return;
    if (currentScreen < TUTORIAL_SCREENS.length - 1) {
      setSlideDirection('left');
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentScreen(currentScreen + 1);
        setIsAnimating(false);
      }, 200);
    }
  }

  function goPrev() {
    if (isAnimating) return;
    if (currentScreen > 0) {
      setSlideDirection('right');
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentScreen(currentScreen - 1);
        setIsAnimating(false);
      }, 200);
    }
  }

  function goToScreen(index) {
    if (isAnimating || index === currentScreen) return;
    setSlideDirection(index > currentScreen ? 'left' : 'right');
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentScreen(index);
      setIsAnimating(false);
    }, 200);
  }

  function onTouchStart(e) {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  }

  function onTouchMove(e) {
    setTouchEnd(e.targetTouches[0].clientX);
  }

  function onTouchEnd() {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      goNext();
    } else if (isRightSwipe) {
      goPrev();
    }
  }

  function handleCta() {
    if (currentScreen === TUTORIAL_SCREENS.length - 1) {
      onComplete();
    } else {
      goNext();
    }
  }

  const screen = TUTORIAL_SCREENS[currentScreen];
  const Icon = screen.icon;
  const isFirstScreen = currentScreen === 0;
  const isLastScreen = currentScreen === TUTORIAL_SCREENS.length - 1;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-primary-50 via-white to-violet-50 z-50 flex flex-col">
      {/* Skip button - subtle at top */}
      {!isLastScreen && (
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={onComplete}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors px-3 py-1.5"
          >
            Skip tutorial
          </button>
        </div>
      )}

      {/* Main content area */}
      <div
        ref={containerRef}
        className="flex-1 flex items-center justify-center px-6 py-8 overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Navigation arrows - desktop */}
        <button
          onClick={goPrev}
          disabled={isFirstScreen}
          className={`hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 items-center justify-center rounded-full bg-white shadow-md transition-all ${
            isFirstScreen ? 'opacity-30 cursor-not-allowed' : 'hover:bg-gray-50 hover:shadow-lg'
          }`}
        >
          <ChevronLeft size={24} className="text-gray-600" />
        </button>

        <button
          onClick={goNext}
          disabled={isLastScreen}
          className={`hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 items-center justify-center rounded-full bg-white shadow-md transition-all ${
            isLastScreen ? 'opacity-30 cursor-not-allowed' : 'hover:bg-gray-50 hover:shadow-lg'
          }`}
        >
          <ChevronRight size={24} className="text-gray-600" />
        </button>

        {/* Card */}
        <div
          className={`w-full max-w-sm bg-white rounded-3xl shadow-xl p-6 sm:p-8 transition-all duration-200 ${
            isAnimating
              ? slideDirection === 'left'
                ? 'opacity-0 -translate-x-8'
                : 'opacity-0 translate-x-8'
              : 'opacity-100 translate-x-0'
          }`}
        >
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className={`w-14 h-14 rounded-2xl ${screen.iconBg} flex items-center justify-center`}>
              <Icon size={28} className={screen.iconColor} />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 text-center mb-2">
            {screen.title}
          </h2>

          {/* Tagline at top position */}
          {screen.tagline && screen.taglinePosition === 'top' && (
            <Tagline text={screen.tagline} />
          )}

          {/* Subtitle */}
          {screen.subtitle && (
            <p className="text-gray-600 text-center mb-3">{screen.subtitle}</p>
          )}

          {/* Content */}
          {screen.content && (
            <p className="text-gray-600 text-center mb-3">{screen.content}</p>
          )}

          {/* Visual mockup for dashboard */}
          {screen.visual === 'quick-entry' && (
            <div className="bg-gray-50 rounded-xl p-3 mb-3 border border-gray-100">
              <div className="flex gap-2 items-center">
                <div className="flex-1 bg-white rounded-lg px-3 py-2 text-sm text-gray-400 border border-gray-200">
                  Had oatmeal with berries...
                </div>
                <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
                  <ChevronRight size={16} className="text-white" />
                </div>
              </div>
            </div>
          )}

          {/* Bullets */}
          {screen.bullets && (
            <ul className="space-y-1.5 mb-3">
              {screen.bullets.map((bullet, i) => (
                <li key={i} className="flex items-start gap-2 text-gray-600 text-sm">
                  <span className="text-primary-500 mt-0.5">•</span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Examples */}
          {screen.examples && (
            <div className="space-y-1.5 mb-3">
              {screen.examples.map((example, i) => (
                <div key={i} className="bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-600 italic">
                  {example}
                </div>
              ))}
            </div>
          )}

          {/* Numbered list */}
          {screen.numbered && (
            <div className="space-y-2.5 mb-3">
              {screen.numbered.map((item, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-sm font-semibold shrink-0">
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-gray-800 font-medium text-sm">{item.title}</p>
                    <p className="text-gray-500 text-xs">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Highlight */}
          {screen.highlight && (
            <div className="bg-gray-100 text-gray-700 rounded-lg px-4 py-2 text-center font-medium text-sm mb-3">
              {screen.highlight}
            </div>
          )}

          {/* Example text */}
          {screen.example && (
            <p className="text-gray-600 text-sm text-center mb-3">{screen.example}</p>
          )}

          {/* Tips */}
          {screen.tips && (
            <div className="space-y-2 mb-3">
              {screen.tips.map((tip, i) => (
                <div key={i} className="text-sm">
                  <span className="text-gray-800 font-medium">{tip.text}</span>
                  <span className="text-gray-500"> {tip.detail}</span>
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          {screen.footer && (
            <p className="text-gray-500 text-sm text-center mb-3">{screen.footer}</p>
          )}

          {/* Tagline at bottom position (default) */}
          {screen.tagline && screen.taglinePosition !== 'top' && (
            <Tagline text={screen.tagline} />
          )}

          {/* CTA button */}
          {screen.cta && (
            <button
              onClick={handleCta}
              className="w-full py-3 bg-primary-500 text-white rounded-xl font-semibold hover:bg-primary-600 transition-colors flex items-center justify-center gap-2"
            >
              {screen.cta}
              {screen.ctaIcon && <ChevronRight size={18} />}
            </button>
          )}

          {/* Footnote */}
          {screen.footnote && (
            <p className="text-gray-400 text-xs text-center mt-4">{screen.footnote}</p>
          )}
        </div>
      </div>

      {/* Progress dots */}
      <div className="pb-8 pt-4">
        <div className="flex justify-center gap-2">
          {TUTORIAL_SCREENS.map((_, i) => (
            <button
              key={i}
              onClick={() => goToScreen(i)}
              className={`w-2 h-2 rounded-full transition-all ${
                i === currentScreen
                  ? 'bg-primary-500 w-6'
                  : 'bg-gray-300 hover:bg-gray-400'
              }`}
              aria-label={`Go to screen ${i + 1}`}
            />
          ))}
        </div>

        {/* Swipe hint on mobile */}
        {!isFirstScreen && !isLastScreen && (
          <p className="text-gray-400 text-xs text-center mt-3 sm:hidden">
            ← Swipe to navigate →
          </p>
        )}
      </div>
    </div>
  );
}
