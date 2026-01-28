import React, { useState, useEffect, useRef } from 'react';
import { Send, Menu, Search, Check, X, Sparkles, MessageCircle, Activity } from 'lucide-react';
import { extractNotes, stripNotes } from '../noteParser';
import { addNote, getNotes } from '../notesStore';
import { addBookmark } from '../bookmarkStore';
import { assignCategory } from '../categoryUtils';
import { parseCitations, formatText, HIGHLIGHT_CATEGORIES } from '../citationParser';
import { parsePlaybookSuggestion } from '../playbookSuggestionParser';
import { addSuggestion, approveSuggestion, dismissSuggestion, getPendingSuggestions } from '../playbookSuggestionsStore';
import { applyPlaybookSuggestion } from '../playbookStore';
import { getRecentCheckIns } from '../checkInStore';
import { getNutritionProfile, isCalibrationComplete, getCalibrationProgress } from '../nutritionCalibrationStore';
import { parseLearnedInsights, stripInsightBlocks } from '../learnedInsightParser';
import { addLearnedInsight, getLearnedInsights } from '../learnedInsightsStore';
import {
  getAllChats,
  getActiveChats,
  getArchivedChats,
  getChatById,
  createChat,
  updateChatMessages,
  filterChatsByCategory,
  migrateFromOldFormat,
  archiveMessage,
  CHAT_CATEGORIES,
} from '../multiChatStore';
import ChatSidebar from './ChatSidebar';
import ChatSearchPopup from './ChatSearchPopup';
import ChatTableOfContents from './ChatTableOfContents';
import TextSelectionPopup from './TextSelectionPopup';
import CitationPopup from './CitationPopup';
import ActivityLog from './ActivityLog';
import MessageActions from './MessageActions';

export default function Chat({
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
  hideActivityTab = false,
}) {
  // Multi-chat state
  const [chats, setChats] = useState([]);
  const [archivedChats, setArchivedChats] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showArchived, setShowArchived] = useState(false);

  // Current chat state
  const [activeTab, setActiveTab] = useState('chat');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [thinkingMessage, setThinkingMessage] = useState('');
  const [lastUserQuestion, setLastUserQuestion] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectionPopup, setSelectionPopup] = useState(null);
  const [citationPopup, setCitationPopup] = useState(null);
  const [highlightTooltip, setHighlightTooltip] = useState(null);
  const [pendingSuggestions, setPendingSuggestions] = useState({});
  const [approvedSuggestions, setApprovedSuggestions] = useState({});

  // Quippy thinking messages
  const thinkingMessages = {
    running: [
      "Lacing up my running shoes...",
      "Checking the split times...",
      "Jogging through some ideas...",
      "Mapping out your route...",
    ],
    lifting: [
      "Racking the weights...",
      "Calculating your gains...",
      "Checking the lifting logs...",
      "Spotting some insights...",
    ],
    nutrition: [
      "Checking the pantry...",
      "Crunching the macros...",
      "Reviewing the meal plan...",
      "Cooking up some advice...",
    ],
    protein: [
      "Shaking up some ideas...",
      "Measuring the scoops...",
      "Mixing your macros...",
    ],
    shoes: [
      "Checking out different kicks...",
      "Trying on some options...",
      "Lacing up the research...",
    ],
    general: [
      "Thinking...",
      "Hmm, let me consider that...",
      "Consulting my notes...",
      "Putting on my coaching hat...",
      "Working on it...",
      "Gathering insights...",
    ],
  };

  function getThinkingCategory(question) {
    const q = question.toLowerCase();
    if (q.includes('run') || q.includes('cardio') || q.includes('jog') || q.includes('mile') || q.includes('pace')) {
      return 'running';
    }
    if (q.includes('lift') || q.includes('weight') || q.includes('bench') || q.includes('squat') || q.includes('deadlift') || q.includes('strength')) {
      return 'lifting';
    }
    if (q.includes('protein') || q.includes('shake') || q.includes('whey') || q.includes('scoop')) {
      return 'protein';
    }
    if (q.includes('food') || q.includes('meal') || q.includes('eat') || q.includes('nutrition') || q.includes('calorie') || q.includes('macro')) {
      return 'nutrition';
    }
    if (q.includes('shoe') || q.includes('gear') || q.includes('equipment')) {
      return 'shoes';
    }
    return 'general';
  }

  function startThinkingAnimation(question) {
    const category = getThinkingCategory(question);
    const messages = thinkingMessages[category];
    let index = 0;

    setThinkingMessage(messages[0]);

    const interval = setInterval(() => {
      index = (index + 1) % messages.length;
      setThinkingMessage(messages[index]);
    }, 2500);

    return interval;
  }

  // Table of Contents state
  const [tocOpen, setTocOpen] = useState(true);
  const [currentVisibleMessageIndex, setCurrentVisibleMessageIndex] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const thinkingIntervalRef = useRef(null);

  // Initialize chats
  useEffect(() => {
    try {
      // Migrate old format if needed
      migrateFromOldFormat();

      // Load chats
      refreshChats();

      // Select first chat or create new one
      const active = getActiveChats();
      if (active.length > 0) {
        selectChat(active[0].id);
      } else {
        handleNewChat();
      }
    } catch (err) {
      console.error('Chat initialization error:', err);
    }
  }, []);

  // Handle targetChatId from profile navigation
  useEffect(() => {
    if (targetChatId) {
      const chat = getChatById(targetChatId);
      if (chat) {
        selectChat(targetChatId);
      }
      onTargetChatIdClear?.();
    }
  }, [targetChatId]);

  // Refresh chat lists
  function refreshChats() {
    const filtered = categoryFilter === 'all'
      ? getActiveChats()
      : filterChatsByCategory(categoryFilter, false);
    setChats(filtered);
    setArchivedChats(getArchivedChats());
  }

  // Select a chat
  function selectChat(chatId) {
    const chat = getChatById(chatId);
    if (chat) {
      setCurrentChatId(chatId);
      setMessages(chat.messages || []);
      setPendingSuggestions({});
      setApprovedSuggestions({});
      setShowArchived(chat.archived);
      // Close sidebar on mobile after selecting a chat
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      }
    }
  }

  // Create new chat
  function handleNewChat() {
    const newChat = createChat();
    setCurrentChatId(newChat.id);
    setMessages([]);
    setPendingSuggestions({});
    setApprovedSuggestions({});
    setShowArchived(false);
    refreshChats();
    // Close sidebar on mobile after creating new chat
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }

  // Update current chat's messages
  function updateMessages(newMessages) {
    setMessages(newMessages);
    if (currentChatId) {
      updateChatMessages(currentChatId, newMessages);
      refreshChats();
    }
  }

  // Handle category filter change
  function handleCategoryFilterChange(category) {
    setCategoryFilter(category);
    const filtered = category === 'all'
      ? getActiveChats()
      : filterChatsByCategory(category, false);
    setChats(filtered);
  }

  // Scroll to bottom on new messages
  useEffect(() => {
    if (!scrollTarget && scrollTarget !== 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  // Handle scroll target from bookmarks
  useEffect(() => {
    if (scrollTarget != null) {
      const el = document.getElementById(`msg-${scrollTarget}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-2', 'ring-primary-400');
        setTimeout(() => {
          el.classList.remove('ring-2', 'ring-primary-400');
        }, 2000);
      }
      onScrollTargetClear?.();
    }
  }, [scrollTarget]);

  // Track which message is currently visible for TOC highlighting
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || activeTab !== 'chat' || messages.length === 0) return;

    // Find last assistant message index for initialization
    let lastAssistantIndex = null;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') {
        lastAssistantIndex = i;
        break;
      }
    }

    // Set initial state to last assistant message
    if (lastAssistantIndex !== null) {
      setCurrentVisibleMessageIndex(lastAssistantIndex);
    }

    // Delay observer setup to allow initial scroll to complete
    let observerEnabled = false;
    const enableTimer = setTimeout(() => {
      observerEnabled = true;
    }, 500);

    const observerCallback = (entries) => {
      // Don't update during initial load - wait for scroll to complete
      if (!observerEnabled) return;

      // Find the most visible assistant message
      let mostVisibleEntry = null;
      let maxRatio = 0;

      for (const entry of entries) {
        if (entry.isIntersecting && entry.intersectionRatio > maxRatio) {
          const msgIndex = parseInt(entry.target.getAttribute('data-msg-index'), 10);
          const msg = messages[msgIndex];
          if (msg?.role === 'assistant') {
            maxRatio = entry.intersectionRatio;
            mostVisibleEntry = entry;
          }
        }
      }

      if (mostVisibleEntry) {
        const idx = parseInt(mostVisibleEntry.target.getAttribute('data-msg-index'), 10);
        setCurrentVisibleMessageIndex(idx);
      }
    };

    const observer = new IntersectionObserver(observerCallback, {
      root: container,
      rootMargin: '-10% 0px -30% 0px',
      threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
    });

    // Observe all message elements
    const messageElements = container.querySelectorAll('[data-msg-index]');
    messageElements.forEach((el) => observer.observe(el));

    // Also manually check on scroll to handle edge cases at bottom
    const handleScroll = () => {
      // Enable observer on first user scroll
      observerEnabled = true;

      const scrollBottom = container.scrollHeight - container.scrollTop - container.clientHeight;

      // If near bottom (within 100px), set to last assistant message
      if (scrollBottom < 100 && lastAssistantIndex !== null) {
        setCurrentVisibleMessageIndex(lastAssistantIndex);
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      clearTimeout(enableTimer);
      observer.disconnect();
      container.removeEventListener('scroll', handleScroll);
    };
  }, [messages, activeTab]);

  // Text selection for bookmarking
  function handleMouseUp(e, msgIndex) {
    if (e.target.closest('.citation-marker')) return;

    const selection = window.getSelection();
    const text = selection?.toString().trim();
    if (!text) {
      setSelectionPopup(null);
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    setSelectionPopup({
      text,
      messageIndex: msgIndex,
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
    });
  }

  // Citation click handler
  function handleCitationClick(e, citations, num) {
    e.stopPropagation();
    const rect = e.target.getBoundingClientRect();
    setCitationPopup({
      citation: citations[num],
      num,
      position: { x: rect.left, y: rect.bottom },
    });
  }

  // Highlight hover handlers
  function handleHighlightHover(e, highlightData) {
    const rect = e.target.getBoundingClientRect();
    setHighlightTooltip({
      ...highlightData,
      position: { x: rect.left + rect.width / 2, y: rect.top },
    });
  }

  function handleHighlightLeave() {
    setHighlightTooltip(null);
  }

  // Handle initial question from Dashboard
  useEffect(() => {
    if (initialQuestion && !loading) {
      sendMessage(initialQuestion);
      onInitialQuestionClear?.();
    }
  }, [initialQuestion]);

  // Send message
  async function sendMessage(text) {
    if (!text || loading) return;

    const userMessage = { role: 'user', content: text };
    const updated = [...messages, userMessage];
    updateMessages(updated);
    setInput('');
    setLastUserQuestion(text);

    if (inputRef.current) {
      inputRef.current.style.height = '44px';
    }
    setLoading(true);

    // Start thinking animation
    thinkingIntervalRef.current = startThinkingAnimation(text);

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          messages: updated,
          profile,
          notes: getNotes(),
          checkIns: getRecentCheckIns(8),
          playbook,
          pendingSuggestions: getPendingSuggestions(),
          groceryData,
          activityLogs: activityLogs || [],
          nutritionProfile: isCalibrationComplete() ? getNutritionProfile() : null,
          nutritionCalibration: !isCalibrationComplete() ? getCalibrationProgress() : null,
          learnedInsights: getLearnedInsights(),
        }),
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        let errMessage = 'Request failed';
        try {
          const err = await res.json();
          errMessage = err.error || errMessage;
        } catch {
          if (res.status === 500 || res.status === 502 || res.status === 503) {
            errMessage = 'Backend server not running. Start it with: npm run dev:full';
          } else {
            errMessage = `Server error (${res.status})`;
          }
        }
        throw new Error(errMessage);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = '';
      let streamingMessages = updated; // Track current state for error recovery

      const withAssistant = [...updated, { role: 'assistant', content: '' }];
      updateMessages(withAssistant);

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6);
            if (data === '[DONE]') break;

            try {
              const parsed = JSON.parse(data);
              if (parsed.error) throw new Error(parsed.error);
              if (parsed.text) {
                assistantText += parsed.text;
                streamingMessages = [...updated, { role: 'assistant', content: assistantText }];
                setMessages(streamingMessages);
              }
            } catch (parseErr) {
              if (parseErr.message !== 'Unexpected end of JSON input') {
                console.error('Parse error:', parseErr);
              }
            }
          }
        }
      } catch (streamErr) {
        // Streaming error - save partial response if we have any
        if (assistantText.trim()) {
          const partialMessages = [...updated, { role: 'assistant', content: assistantText + '\n\n[Response interrupted]' }];
          updateMessages(partialMessages);
        }
        throw streamErr;
      }

      // Extract notes
      const notes = extractNotes(assistantText);
      for (const note of notes) {
        addNote(note.section, note.text);
      }

      // Parse playbook suggestion
      const { cleanText: textWithoutSuggestion, suggestion } = parsePlaybookSuggestion(assistantText);

      // Parse and save learned insights
      const { cleanText: textWithoutInsights, insights } = parseLearnedInsights(textWithoutSuggestion);

      // Save insights and notify parent
      for (const insight of insights) {
        const savedInsight = addLearnedInsight({
          ...insight,
          chatId: currentChatId,
          messageIndex: updated.length, // Index of the assistant message
          originalText: text, // The user's original message
        });
        if (savedInsight) {
          onNewInsight?.(savedInsight);
        }
      }

      let finalText = stripNotes(textWithoutInsights);

      // Update with final clean text
      const finalMessages = [...updated, { role: 'assistant', content: finalText }];
      updateMessages(finalMessages);

      // Store playbook suggestion if present
      if (suggestion && playbook) {
        const messageIndex = updated.length;
        const storedSuggestion = addSuggestion({
          ...suggestion,
          messageIndex,
          source: 'chat',
        });
        setPendingSuggestions(prev => ({
          ...prev,
          [messageIndex]: storedSuggestion,
        }));
        onSuggestionCountChange?.();
      }
    } catch (err) {
      clearTimeout(timeoutId);
      const errorMsg = err.name === 'AbortError'
        ? 'Request timed out. Please try again.'
        : `Sorry, something went wrong: ${err.message}`;
      const errorMessages = [...updated, { role: 'assistant', content: errorMsg }];
      updateMessages(errorMessages);
    } finally {
      setLoading(false);
      setThinkingMessage('');
      if (thinkingIntervalRef.current) {
        clearInterval(thinkingIntervalRef.current);
        thinkingIntervalRef.current = null;
      }
    }
  }

  // Regenerate the last assistant response
  function handleRegenerate(messageIndex) {
    // Find the user message that preceded this assistant message
    if (messageIndex > 0 && messages[messageIndex - 1]?.role === 'user') {
      const userQuestion = messages[messageIndex - 1].content;
      // Remove the assistant message we're regenerating
      const messagesWithoutLast = messages.slice(0, messageIndex);
      updateMessages(messagesWithoutLast);
      // Resend the question
      setTimeout(() => sendMessage(userQuestion), 100);
    }
  }

  function handleSend(e) {
    e.preventDefault();
    sendMessage(input.trim());
  }

  // Approve playbook suggestion
  function handleApproveSuggestion(messageIndex) {
    const suggestion = pendingSuggestions[messageIndex];
    if (!suggestion) return;

    if (suggestion.section === 'profile') {
      const field = suggestion.content?.field;
      const value = suggestion.content?.text;
      if (field && value && onProfileUpdate) {
        let parsedValue = value;
        if (field === 'weight') {
          const numMatch = value.match(/[\d.]+/);
          if (numMatch) parsedValue = parseFloat(numMatch[0]);
        }
        onProfileUpdate({ [field]: parsedValue });
      }
    } else {
      const updatedPlaybook = applyPlaybookSuggestion(suggestion);
      if (updatedPlaybook) {
        onPlaybookChange?.();
      }
    }

    approveSuggestion(suggestion.id);
    setPendingSuggestions(prev => {
      const copy = { ...prev };
      delete copy[messageIndex];
      return copy;
    });
    setApprovedSuggestions(prev => ({ ...prev, [messageIndex]: true }));
    onSuggestionCountChange?.();
  }

  function handleDismissSuggestion(messageIndex) {
    const suggestion = pendingSuggestions[messageIndex];
    if (!suggestion) return;

    dismissSuggestion(suggestion.id);
    setPendingSuggestions(prev => {
      const copy = { ...prev };
      delete copy[messageIndex];
      return copy;
    });
    onSuggestionCountChange?.();
  }

  // Archive individual message
  function handleArchiveMessage(messageIndex) {
    if (currentChatId) {
      archiveMessage(currentChatId, messageIndex);
      const chat = getChatById(currentChatId);
      if (chat) {
        setMessages(chat.messages);
      }
      refreshChats();
    }
  }

  // Handle search result selection
  function handleSearchSelect(msgIndex) {
    setSearchOpen(false);
    scrollToMessage(msgIndex);
  }

  // Handle TOC item click - scroll to message with highlight
  function scrollToMessage(msgIndex) {
    const el = document.getElementById(`msg-${msgIndex}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-primary-400', 'transition-all');
      setCurrentVisibleMessageIndex(msgIndex);
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-primary-400');
      }, 2000);
    }
  }

  // Get current chat for display
  const currentChat = currentChatId ? getChatById(currentChatId) : null;
  const currentCategory = (currentChat && CHAT_CATEGORIES[currentChat.category]) || CHAT_CATEGORIES.general;

  return (
    <div className="h-full flex relative overflow-hidden">
      {/* Sidebar */}
      <ChatSidebar
        chats={chats}
        archivedChats={archivedChats}
        currentChatId={currentChatId}
        onSelectChat={selectChat}
        onNewChat={handleNewChat}
        onChatsChange={refreshChats}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={handleCategoryFilterChange}
        showArchived={showArchived}
        onShowArchivedChange={setShowArchived}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* Header - Fixed at top of chat area */}
        <div className="bg-white/80 backdrop-blur-sm border-b border-gray-100 flex-shrink-0 z-10">
          <div className="max-w-3xl mx-auto px-4">
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                {/* Mobile menu button */}
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="md:hidden p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Menu size={20} className="text-gray-600" />
                </button>

                {/* Chat title with category color */}
                {currentChat && (
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: currentCategory.color }}
                    />
                    <span className="font-medium text-gray-800">
                      {currentChat.title}
                    </span>
                  </div>
                )}
              </div>

              {/* Tab switcher and search */}
              <div className="flex items-center gap-2">
                {!hideActivityTab && (
                  <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setActiveTab('chat')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        activeTab === 'chat'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <MessageCircle size={14} />
                      Chat
                    </button>
                    <button
                      onClick={() => setActiveTab('activity')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        activeTab === 'activity'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <Activity size={14} />
                      Activity
                    </button>
                  </div>
                )}

                {activeTab === 'chat' && (
                  <button
                    onClick={() => setSearchOpen(s => !s)}
                    className="p-2 text-gray-400 hover:text-primary-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Search messages"
                  >
                    <Search size={18} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {searchOpen && activeTab === 'chat' && (
          <ChatSearchPopup
            messages={messages}
            onSelect={handleSearchSelect}
            onClose={() => setSearchOpen(false)}
          />
        )}

        {/* Activity Log Tab */}
        {activeTab === 'activity' && (
          <ActivityLog onActivityDeleted={onActivityLogged} />
        )}

        {/* Chat Messages Tab */}
        {activeTab === 'chat' && (
          <div className="flex-1 overflow-y-auto" ref={messagesContainerRef}>
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-16">
                  <div
                    className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center"
                    style={{ backgroundColor: currentCategory.bgColor }}
                  >
                    <MessageCircle size={24} style={{ color: currentCategory.color }} />
                  </div>
                  <p className="text-gray-500 text-sm">Start a conversation with your health advisor.</p>
                  <p className="text-gray-400 text-xs mt-1">Ask questions, log activities, or get personalized advice.</p>
                </div>
              )}

              {messages.map((msg, i) => {
                if (!msg || !msg.content) return null;
                const isUser = msg.role === 'user';
                // Handle both string content and object content {type, content}
                const messageText = typeof msg.content === 'string'
                  ? msg.content
                  : (msg.content?.content || msg.content?.text || '');
                const { cleanText: parsedText, citations } = parseCitations(messageText);
                const hasSuggestion = pendingSuggestions[i];
                const wasApproved = approvedSuggestions[i];

                return (
                  <div
                    key={i}
                    id={`msg-${i}`}
                    data-msg-index={i}
                    className={`flex ${isUser ? 'justify-end' : 'justify-start'} group transition-all duration-300`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                        isUser
                          ? 'bg-primary-600 text-white'
                          : 'bg-white border border-gray-100 shadow-sm'
                      }`}
                      onMouseUp={!isUser ? (e) => handleMouseUp(e, i) : undefined}
                    >
                      <div className={`text-sm whitespace-pre-wrap leading-relaxed ${isUser ? '' : 'prose prose-sm max-w-none'}`}>
                        {isUser ? (
                          messageText
                        ) : (
                          <>
                            {formatText(
                              parsedText,
                              handleHighlightHover,
                              handleHighlightLeave,
                              citations,
                              (e, num) => handleCitationClick(e, citations, num)
                            )}

                            {/* Playbook Suggestion Card */}
                            {hasSuggestion && (
                              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                                <div className="flex items-start gap-2 mb-2">
                                  <div className="p-1 bg-amber-200 rounded-lg">
                                    <Sparkles size={14} className="text-amber-700" />
                                  </div>
                                  <div className="flex-1">
                                    <span className="text-xs font-medium text-amber-800 uppercase">
                                      {hasSuggestion.section === 'profile' ? 'Profile Update' : 'Playbook Update'}
                                    </span>
                                    <span className="text-xs ml-2 px-1.5 py-0.5 bg-amber-200 text-amber-800 rounded">
                                      {hasSuggestion.action}
                                    </span>
                                  </div>
                                </div>
                                <p className="text-sm text-amber-900 mb-2">
                                  {hasSuggestion.content?.text}
                                </p>
                                {hasSuggestion.rationale && (
                                  <p className="text-xs text-amber-700 mb-2">{hasSuggestion.rationale}</p>
                                )}
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleApproveSuggestion(i)}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 text-white text-xs font-medium rounded-lg hover:bg-emerald-600"
                                  >
                                    <Check size={14} />
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => handleDismissSuggestion(i)}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-gray-200 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-300"
                                  >
                                    <X size={14} />
                                    Dismiss
                                  </button>
                                </div>
                              </div>
                            )}

                            {wasApproved && (
                              <div className="mt-3 flex items-center gap-2 text-xs text-emerald-600">
                                <Check size={14} />
                                <span>Update applied</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {/* Message Actions (for assistant messages) */}
                      {!isUser && (
                        <MessageActions
                          content={messageText}
                          messageIndex={i}
                          onArchive={() => handleArchiveMessage(i)}
                          showArchive={true}
                          showRegenerate={i === messages.length - 1}
                          onRegenerate={() => handleRegenerate(i)}
                        />
                      )}
                    </div>
                  </div>
                );
              })}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-100 shadow-sm rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                        <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      </div>
                      {thinkingMessage && (
                        <span className="text-sm text-gray-500 italic animate-pulse">
                          {thinkingMessage}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>
        )}

        {/* Input Area */}
        {activeTab === 'chat' && (
          <div className="bg-white border-t border-gray-100 p-4">
            <form onSubmit={handleSend} className="max-w-3xl mx-auto">
              <div className="flex gap-2 items-end">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    // Reset to auto to measure true scrollHeight
                    e.target.style.height = 'auto';
                    // Set to scrollHeight, clamped between 44px and 150px
                    const newHeight = Math.max(44, Math.min(e.target.scrollHeight, 150));
                    e.target.style.height = newHeight + 'px';
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend(e);
                    }
                  }}
                  onFocus={(e) => {
                    // Smoothly expand slightly on focus for better UX
                    if (!input) {
                      e.target.style.height = '52px';
                    }
                  }}
                  onBlur={(e) => {
                    // Return to normal height when empty and unfocused
                    if (!input) {
                      e.target.style.height = '44px';
                    }
                  }}
                  placeholder="Ask your health advisor anything..."
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary-300 focus:ring-2 focus:ring-primary-100 outline-none text-gray-700 text-sm resize-none min-h-[44px] max-h-[150px] transition-[height,border-color,box-shadow] duration-200"
                  disabled={loading}
                  rows={1}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="px-4 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed h-[44px]"
                >
                  <Send size={18} />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Popups */}
        {selectionPopup && (
          <TextSelectionPopup
            x={selectionPopup.x}
            y={selectionPopup.y}
            onBookmark={() => {
              const bookmark = {
                id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
                text: selectionPopup.text,
                source: 'selection',
                messageIndex: selectionPopup.messageIndex,
                date: new Date().toISOString(),
                category: assignCategory(selectionPopup.text),
              };
              addBookmark(bookmark);
              setSelectionPopup(null);
              window.getSelection()?.removeAllRanges();
            }}
            onDismiss={() => setSelectionPopup(null)}
          />
        )}

        {citationPopup && (
          <CitationPopup
            {...citationPopup}
            onClose={() => setCitationPopup(null)}
          />
        )}

        {/* Highlight Tooltip */}
        {highlightTooltip && (
          <div
            className="fixed z-50 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg max-w-xs pointer-events-none"
            style={{
              left: `${Math.min(Math.max(highlightTooltip.position.x, 100), window.innerWidth - 150)}px`,
              top: `${highlightTooltip.position.y - 8}px`,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span>{highlightTooltip.config?.emoji || '📌'}</span>
              <span className="font-medium">{highlightTooltip.config?.label || 'Highlight'}</span>
            </div>
            {highlightTooltip.rationale && highlightTooltip.rationale !== '?' && (
              <p className="text-gray-300">{highlightTooltip.rationale}</p>
            )}
            {/* Tooltip arrow */}
            <div
              className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 bg-gray-900 rotate-45"
            />
          </div>
        )}
      </div>

      {/* Table of Contents Sidebar */}
      {activeTab === 'chat' && (
        <ChatTableOfContents
          messages={messages}
          currentVisibleIndex={currentVisibleMessageIndex}
          onScrollToMessage={scrollToMessage}
          isOpen={tocOpen}
          onToggle={() => setTocOpen(!tocOpen)}
        />
      )}
    </div>
  );
}
