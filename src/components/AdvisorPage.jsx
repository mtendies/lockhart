import { useState, useEffect, useRef } from 'react';
import { MessageCircle, Bookmark, Activity } from 'lucide-react';
import Chat from './Chat';
import Bookmarks from './Bookmarks';
import ActivityLog from './ActivityLog';

const ADVISOR_TABS = [
  { id: 'chat', label: 'Chat', icon: MessageCircle },
  { id: 'bookmarks', label: 'Bookmarks', icon: Bookmark },
  { id: 'activity', label: 'Activity', icon: Activity },
];

export default function AdvisorPage({
  profile,
  playbook,
  groceryData,
  activityLogs,
  scrollTarget,
  initialQuestion,
  targetChatId,
  onScrollTargetClear,
  onInitialQuestionClear,
  onTargetChatIdClear,
  onSuggestionCountChange,
  onPlaybookChange,
  onActivityLogged,
  onProfileUpdate,
  onNewInsight,
  onNavigateToChat,
}) {
  const [activeTab, setActiveTab] = useState('chat');
  const contentRef = useRef(null);

  // Scroll to top when switching tabs (except chat which manages its own scroll)
  useEffect(() => {
    if (activeTab !== 'chat' && contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  }, [activeTab]);

  // Handle navigation from bookmarks to chat
  function handleScrollToChat(msgIndex) {
    setActiveTab('chat');
    // Pass scroll target to chat
    onScrollTargetClear?.(); // Clear any existing
    setTimeout(() => {
      const el = document.getElementById(`msg-${msgIndex}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-2', 'ring-primary-400', 'transition-all');
        setTimeout(() => {
          el.classList.remove('ring-2', 'ring-primary-400');
        }, 2000);
      }
    }, 100);
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-gray-50/50">
      {/* Tab Bar - Fixed at top of advisor area */}
      <div className="bg-white border-b border-gray-200 flex-shrink-0 z-20">
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex items-center gap-1 py-2">
            {ADVISOR_TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Content - Takes remaining height */}
      <div ref={contentRef} className="flex-1 min-h-0 overflow-hidden">
        {activeTab === 'chat' && (
          <Chat
            profile={profile}
            playbook={playbook}
            groceryData={groceryData}
            activityLogs={activityLogs}
            scrollTarget={scrollTarget}
            initialQuestion={initialQuestion}
            targetChatId={targetChatId}
            onScrollTargetClear={onScrollTargetClear}
            onInitialQuestionClear={onInitialQuestionClear}
            onTargetChatIdClear={onTargetChatIdClear}
            onSuggestionCountChange={onSuggestionCountChange}
            onPlaybookChange={onPlaybookChange}
            onActivityLogged={onActivityLogged}
            onProfileUpdate={onProfileUpdate}
            onNewInsight={onNewInsight}
            hideActivityTab={true}
          />
        )}

        {activeTab === 'bookmarks' && (
          <div className="h-full overflow-y-auto">
            <Bookmarks onScrollToChat={handleScrollToChat} />
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="h-full overflow-y-auto">
            <ActivityLog onActivityDeleted={onActivityLogged} />
          </div>
        )}
      </div>
    </div>
  );
}
