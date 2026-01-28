import { useState, useEffect, useRef } from 'react';
import { List, ChevronRight, ChevronLeft, X } from 'lucide-react';

/**
 * Generate a short title for an advisor response based on its content
 */
function generateResponseTitle(content, index) {
  if (!content || typeof content !== 'string') {
    return `Response ${index + 1}`;
  }

  const text = content.toLowerCase();

  // Topic patterns for advisor responses
  const patterns = [
    // Protein & nutrition
    { pattern: /protein.*timing|when.*protein|protein.*before|protein.*after/i, title: 'Protein timing' },
    { pattern: /whey|casein|pea protein|protein powder/i, title: 'Protein options' },
    { pattern: /how much protein|protein.*gram|daily protein/i, title: 'Protein needs' },
    { pattern: /pre-workout.*meal|before.*workout.*eat/i, title: 'Pre-workout nutrition' },
    { pattern: /post-workout.*meal|after.*workout.*eat/i, title: 'Post-workout nutrition' },
    { pattern: /breakfast|morning meal/i, title: 'Breakfast ideas' },
    { pattern: /lunch/i, title: 'Lunch suggestions' },
    { pattern: /dinner|evening meal/i, title: 'Dinner ideas' },
    { pattern: /snack/i, title: 'Snack options' },
    { pattern: /calorie|calories|caloric/i, title: 'Calorie guidance' },
    { pattern: /macro|macronutrient/i, title: 'Macro breakdown' },
    { pattern: /carb|carbohydrate/i, title: 'Carb advice' },
    { pattern: /fat|fats|omega/i, title: 'Dietary fats' },
    { pattern: /hydration|water.*intake|drink.*water/i, title: 'Hydration tips' },
    { pattern: /supplement|vitamin|creatine|caffeine/i, title: 'Supplement advice' },
    { pattern: /meal prep|meal plan/i, title: 'Meal planning' },
    { pattern: /grocery|shopping/i, title: 'Grocery suggestions' },

    // Fitness & training
    { pattern: /workout.*plan|training.*program|exercise.*routine/i, title: 'Training plan' },
    { pattern: /strength training|weight.*training|lifting/i, title: 'Strength training' },
    { pattern: /cardio|running|jogging/i, title: 'Cardio guidance' },
    { pattern: /leg.*day|leg.*workout|squat/i, title: 'Leg training' },
    { pattern: /upper body|chest|back|shoulder/i, title: 'Upper body work' },
    { pattern: /core|abs|abdominal/i, title: 'Core exercises' },
    { pattern: /stretch|flexibility|mobility/i, title: 'Flexibility work' },
    { pattern: /warm.?up|cool.?down/i, title: 'Warm-up tips' },
    { pattern: /rest day|recovery day/i, title: 'Rest day advice' },

    // Recovery & sleep
    { pattern: /sleep.*quality|better.*sleep|improve.*sleep/i, title: 'Sleep optimization' },
    { pattern: /sleep.*schedule|bedtime|circadian/i, title: 'Sleep schedule' },
    { pattern: /recovery|muscle.*recovery|doms/i, title: 'Recovery strategy' },
    { pattern: /sore|soreness|muscle.*ache/i, title: 'Soreness relief' },
    { pattern: /injury|pain|hurt/i, title: 'Injury guidance' },
    { pattern: /stress|anxiety|mental/i, title: 'Stress management' },
    { pattern: /energy|fatigue|tired/i, title: 'Energy tips' },

    // Goals & progress
    { pattern: /weight.*loss|lose.*weight|fat.*loss/i, title: 'Weight loss tips' },
    { pattern: /muscle.*gain|build.*muscle|bulk/i, title: 'Muscle building' },
    { pattern: /progress|plateau|stuck/i, title: 'Progress review' },
    { pattern: /goal|target/i, title: 'Goal setting' },
    { pattern: /check.?in|weekly.*review/i, title: 'Check-in review' },
    { pattern: /playbook|focus.*item/i, title: 'Playbook update' },

    // Activity logging
    { pattern: /great.*job|nice.*work|well.*done|excellent/i, title: 'Activity logged' },
    { pattern: /logged|recorded|tracked/i, title: 'Progress tracked' },

    // General advice
    { pattern: /recommend|suggest|advise/i, title: 'Recommendations' },
    { pattern: /here.*are|here's|try.*these/i, title: 'Suggestions' },
    { pattern: /important|key.*point|remember/i, title: 'Key points' },
  ];

  // Try to match patterns
  for (const { pattern, title } of patterns) {
    if (pattern.test(text)) {
      return title;
    }
  }

  // Fallback: Extract first meaningful phrase
  const firstLine = content.split('\n')[0].trim();
  if (firstLine.length > 0 && firstLine.length <= 40) {
    // Clean up and use first line if it's short enough
    let title = firstLine.replace(/^(great|okay|sure|yes|no|hi|hello|hey)[,!.]?\s*/i, '');
    title = title.replace(/[*#]+/g, '').trim();
    if (title.length > 0 && title.length <= 30) {
      return title.charAt(0).toUpperCase() + title.slice(1);
    }
  }

  // Last resort fallback
  return `Response ${index + 1}`;
}

export default function ChatTableOfContents({
  messages,
  currentVisibleIndex,
  onScrollToMessage,
  isOpen,
  onToggle,
}) {
  const [tocItems, setTocItems] = useState([]);
  const tocRef = useRef(null);

  // Generate TOC items from assistant messages
  useEffect(() => {
    const assistantMessages = messages
      .map((msg, index) => ({ msg, index }))
      .filter(({ msg }) => msg.role === 'assistant' && msg.content);

    const items = assistantMessages.map(({ msg, index }, tocIndex) => {
      // Handle both string and object content
      const content = typeof msg.content === 'string'
        ? msg.content
        : (msg.content?.content || msg.content?.text || '');

      return {
        messageIndex: index,
        tocIndex,
        title: generateResponseTitle(content, tocIndex),
        preview: content.slice(0, 100).replace(/\n/g, ' ').trim(),
      };
    });

    setTocItems(items);
  }, [messages]);

  // Scroll active TOC item into view
  useEffect(() => {
    if (tocRef.current && currentVisibleIndex !== null) {
      const activeItem = tocRef.current.querySelector(`[data-index="${currentVisibleIndex}"]`);
      if (activeItem) {
        activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [currentVisibleIndex]);

  if (tocItems.length === 0) {
    return null;
  }

  return (
    <>
      {/* Desktop/Tablet TOC Sidebar - Fixed height to allow internal scrolling */}
      <div
        className={`hidden md:flex flex-col h-full flex-shrink-0 bg-gray-50/50 border-l border-gray-100 transition-all duration-200 ${
          isOpen ? 'w-48' : 'w-0'
        }`}
      >
        {isOpen && (
          <div className="flex flex-col h-full overflow-hidden">
            {/* Header - minimal */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
              <span className="text-xs font-medium text-gray-500">{tocItems.length} responses</span>
              <button
                onClick={onToggle}
                className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>

            {/* TOC List - compact */}
            <div ref={tocRef} className="flex-1 overflow-y-auto py-1">
              {tocItems.map((item, idx) => {
                const isActive = currentVisibleIndex === item.messageIndex;

                return (
                  <button
                    key={item.messageIndex}
                    data-index={item.messageIndex}
                    onClick={() => onScrollToMessage(item.messageIndex)}
                    className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                      isActive
                        ? 'bg-primary-50 text-primary-700 border-l-2 border-primary-500'
                        : 'text-gray-600 hover:bg-gray-100 border-l-2 border-transparent'
                    }`}
                  >
                    <span className="text-gray-400 mr-1.5">{idx + 1}.</span>
                    <span className={isActive ? 'font-medium' : ''}>{item.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Desktop Toggle Button (when collapsed) */}
      {!isOpen && (
        <button
          onClick={onToggle}
          className="hidden md:flex fixed right-0 top-1/2 -translate-y-1/2 z-30 p-1.5 bg-gray-50 border border-gray-200 border-r-0 rounded-l text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          title="Show contents"
        >
          <ChevronLeft size={12} />
        </button>
      )}

      {/* Mobile/Tablet Floating Button - smaller, positioned above bottom nav */}
      <button
        onClick={onToggle}
        className="md:hidden fixed right-3 bottom-24 z-40 p-2 bg-white text-gray-600 border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
      >
        <List size={16} />
      </button>

      {/* Mobile Bottom Sheet - simplified */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30"
            onClick={onToggle}
          />

          {/* Bottom Sheet - positioned above bottom nav */}
          <div className="absolute bottom-16 left-0 right-0 bg-white rounded-t-xl max-h-[50vh] flex flex-col shadow-xl">
            {/* Handle */}
            <div className="flex justify-center py-2">
              <div className="w-8 h-1 bg-gray-300 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
              <span className="text-sm font-medium text-gray-700">Jump to response</span>
              <button
                onClick={onToggle}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            {/* TOC List - compact */}
            <div className="flex-1 overflow-y-auto py-2">
              {tocItems.map((item, idx) => {
                const isActive = currentVisibleIndex === item.messageIndex;

                return (
                  <button
                    key={item.messageIndex}
                    onClick={() => {
                      onScrollToMessage(item.messageIndex);
                      onToggle();
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                      isActive
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-gray-400 mr-2">{idx + 1}.</span>
                    <span className={isActive ? 'font-medium' : ''}>{item.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
