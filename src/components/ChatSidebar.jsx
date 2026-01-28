import { useState, useRef } from 'react';
import {
  Plus,
  Search,
  Archive,
  ArchiveRestore,
  ChevronLeft,
  ChevronRight,
  X,
  Edit2,
  Check,
  Trash2,
  MessageCircle,
} from 'lucide-react';
import {
  CHAT_CATEGORIES,
  getChatSummary,
  archiveChat,
  unarchiveChat,
  deleteChat,
  updateChatTitle,
  searchChats,
} from '../multiChatStore';

export default function ChatSidebar({
  chats,
  archivedChats,
  currentChatId,
  onSelectChat,
  onNewChat,
  onChatsChange,
  isOpen,
  onToggle,
  categoryFilter,
  onCategoryFilterChange,
  showArchived,
  onShowArchivedChange,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [undoAction, setUndoAction] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const editInputRef = useRef(null);

  // Handle search
  function handleSearch(query) {
    setSearchQuery(query);
    if (query.trim().length >= 2) {
      setSearchResults(searchChats(query));
    } else {
      setSearchResults(null);
    }
  }

  // Handle archive with undo
  function handleArchive(chatId, e) {
    e.stopPropagation();
    archiveChat(chatId);
    onChatsChange();

    // Show undo toast
    setUndoAction({ type: 'archive', chatId });
    setTimeout(() => setUndoAction(null), 5000);

    // If archived current chat, select another
    if (chatId === currentChatId) {
      const remaining = chats.filter(c => c.id !== chatId);
      if (remaining.length > 0) {
        onSelectChat(remaining[0].id);
      } else {
        onNewChat();
      }
    }
  }

  // Handle unarchive
  function handleUnarchive(chatId, e) {
    e.stopPropagation();
    unarchiveChat(chatId);
    onChatsChange();
  }

  // Handle undo
  function handleUndo() {
    if (!undoAction) return;

    if (undoAction.type === 'archive') {
      unarchiveChat(undoAction.chatId);
      onChatsChange();
    }
    setUndoAction(null);
  }

  // Handle delete
  function handleDelete(chatId, e) {
    e.stopPropagation();
    if (!window.confirm('Delete this chat permanently?')) return;
    deleteChat(chatId);
    onChatsChange();

    if (chatId === currentChatId) {
      const remaining = chats.filter(c => c.id !== chatId);
      if (remaining.length > 0) {
        onSelectChat(remaining[0].id);
      } else {
        onNewChat();
      }
    }
  }

  // Handle title edit
  function startEditing(chat, e) {
    e.stopPropagation();
    setEditingId(chat.id);
    setEditTitle(chat.title);
    setTimeout(() => editInputRef.current?.focus(), 50);
  }

  function saveTitle(chatId) {
    if (editTitle.trim()) {
      updateChatTitle(chatId, editTitle.trim());
      onChatsChange();
    }
    setEditingId(null);
  }

  // Format date
  function formatDate(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (24 * 60 * 60 * 1000));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  }

  const displayChats = searchResults || (showArchived ? archivedChats : chats);

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={onToggle}
        />
      )}

      {/* Sidebar - fixed height on desktop to allow internal scrolling */}
      <div
        className={`fixed md:relative inset-y-0 md:inset-y-auto left-0 z-50 md:z-10 w-full sm:w-80 md:h-full bg-white border-r border-gray-200 flex flex-col flex-shrink-0 transform transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:w-0 md:overflow-hidden'
        }`}
      >
        {/* Header */}
        <div className="p-3 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-800">Chats</h2>
            <div className="flex items-center gap-1">
              <button
                onClick={onNewChat}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="New chat"
              >
                <Plus size={18} className="text-gray-600" />
              </button>
              <button
                onClick={onToggle}
                className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={18} className="text-gray-600" />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search chats..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => handleSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Category Filter - collapsible */}
          <div className="mt-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors mb-1"
            >
              <ChevronRight
                size={12}
                className={`transition-transform ${showFilters ? 'rotate-90' : ''}`}
              />
              <span>Filters</span>
              {categoryFilter !== 'all' && (
                <span className="px-1.5 py-0.5 bg-primary-100 text-primary-700 rounded-full text-[10px]">
                  {CHAT_CATEGORIES[categoryFilter]?.label || categoryFilter}
                </span>
              )}
            </button>
            {showFilters && (
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => onCategoryFilterChange('all')}
                  className={`px-2 py-1 text-xs rounded-full transition-colors ${
                    categoryFilter === 'all'
                      ? 'bg-gray-800 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  All
                </button>
                {Object.entries(CHAT_CATEGORIES).map(([key, { label, color }]) => (
                  <button
                    key={key}
                    onClick={() => onCategoryFilterChange(key)}
                    className={`px-2 py-1 text-xs rounded-full transition-colors flex items-center gap-1 ${
                      categoryFilter === key
                        ? 'bg-gray-800 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {searchResults && (
            <div className="px-3 py-2 text-xs text-gray-500 bg-gray-50 border-b border-gray-100">
              {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{searchQuery}"
            </div>
          )}

          {displayChats.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500">
              {searchResults ? 'No chats found' : showArchived ? 'No archived chats' : 'No chats yet'}
            </div>
          ) : (
            <div className="py-1">
              {displayChats.map((chat) => {
                const category = CHAT_CATEGORIES[chat.category] || CHAT_CATEGORIES.general;
                const isActive = chat.id === currentChatId;
                const isEditing = editingId === chat.id;

                return (
                  <div
                    key={chat.id}
                    onClick={() => !isEditing && onSelectChat(chat.id)}
                    className={`group px-3 py-2 mx-2 my-0.5 rounded-lg cursor-pointer transition-colors ${
                      isActive
                        ? 'bg-primary-50 border border-primary-200'
                        : 'hover:bg-gray-50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {/* Category indicator */}
                      <div
                        className="w-1 rounded-full shrink-0 self-stretch"
                        style={{ backgroundColor: category.color }}
                      />

                      <div className="flex-1">
                        {/* Title */}
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <input
                              ref={editInputRef}
                              type="text"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveTitle(chat.id);
                                if (e.key === 'Escape') setEditingId(null);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="flex-1 text-sm font-medium px-1 py-0.5 border border-primary-300 rounded focus:outline-none"
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                saveTitle(chat.id);
                              }}
                              className="p-1 text-primary-600 hover:bg-primary-100 rounded"
                            >
                              <Check size={14} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <p className="text-sm font-semibold text-gray-800">
                              {chat.title}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {getChatSummary(chat)}
                            </p>
                            <span className="text-[10px] text-gray-400 mt-1 block">
                              {formatDate(chat.lastActivity)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Actions (show on hover) */}
                    {!isEditing && (
                      <div className="flex items-center gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => startEditing(chat, e)}
                          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                          title="Rename"
                        >
                          <Edit2 size={12} />
                        </button>
                        {showArchived ? (
                          <button
                            onClick={(e) => handleUnarchive(chat.id, e)}
                            className="p-1 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded"
                            title="Unarchive"
                          >
                            <ArchiveRestore size={12} />
                          </button>
                        ) : (
                          <button
                            onClick={(e) => handleArchive(chat.id, e)}
                            className="p-1 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded"
                            title="Archive"
                          >
                            <Archive size={12} />
                          </button>
                        )}
                        {showArchived && (
                          <button
                            onClick={(e) => handleDelete(chat.id, e)}
                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Delete"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer - Archive Toggle */}
        <div className="p-2 border-t border-gray-100">
          <button
            onClick={() => onShowArchivedChange(!showArchived)}
            className={`w-full flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
              showArchived
                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Archive size={14} />
            {showArchived ? 'Viewing Archived' : `Archived (${archivedChats.length})`}
          </button>
        </div>
      </div>

      {/* Toggle Button (when sidebar is closed on desktop) */}
      {!isOpen && (
        <button
          onClick={onToggle}
          className="hidden md:flex fixed left-0 top-1/2 -translate-y-1/2 z-30 p-2 bg-white border border-gray-200 border-l-0 rounded-r-lg shadow-sm hover:bg-gray-50 transition-colors"
        >
          <ChevronRight size={16} className="text-gray-600" />
        </button>
      )}

      {/* Undo Toast */}
      {undoAction && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-3 animate-slide-up">
          <span className="text-sm">Chat archived</span>
          <button
            onClick={handleUndo}
            className="text-sm font-medium text-primary-300 hover:text-primary-200"
          >
            Undo
          </button>
        </div>
      )}
    </>
  );
}
