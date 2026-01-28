import { useState, useEffect } from 'react';
import { Search, Bookmark, Sparkles, List, LayoutGrid } from 'lucide-react';
import { getBookmarks, removeBookmark } from '../bookmarkStore';
import { CATEGORIES } from '../categoryUtils';
import BookmarkIntelligentView from './BookmarkIntelligentView';
import BookmarkTraditionalView from './BookmarkTraditionalView';

export default function Bookmarks({ onScrollToMessage }) {
  const [bookmarks, setBookmarks] = useState(() => getBookmarks());
  const [viewMode, setViewMode] = useState('intelligent');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');

  useEffect(() => {
    setBookmarks(getBookmarks());
  }, []);

  function handleDelete(id) {
    const updated = removeBookmark(id);
    setBookmarks(updated);
  }

  let filtered = bookmarks;

  if (search.trim()) {
    const q = search.toLowerCase();
    filtered = filtered.filter(b => b.text.toLowerCase().includes(q));
  }

  if (categoryFilter !== 'all') {
    filtered = filtered.filter(b => b.category === categoryFilter);
  }

  filtered = [...filtered].sort((a, b) => {
    if (sortOrder === 'newest') return new Date(b.date) - new Date(a.date);
    return new Date(a.date) - new Date(b.date);
  });

  const hasBookmarks = bookmarks.length > 0;

  return (
    <div className="bg-gradient-to-br from-amber-50/50 via-white to-orange-50/30 pb-8">
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl shadow-lg shadow-amber-200/50">
              <Bookmark className="text-white" size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Your Saved Insights</h1>
              <p className="text-sm text-gray-500">
                {hasBookmarks
                  ? `${bookmarks.length} piece${bookmarks.length === 1 ? '' : 's'} of wisdom saved`
                  : 'Save advice from your Advisor to reference later'}
              </p>
            </div>
          </div>
        </div>

        {hasBookmarks ? (
          <>
            {/* Controls */}
            <div className="sticky top-[52px] z-10 bg-gradient-to-br from-amber-50/80 via-white/80 to-orange-50/80 backdrop-blur-sm pb-4 -mx-4 px-4 space-y-3">
              {/* View Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 bg-white rounded-xl p-1 shadow-sm border border-gray-100">
                  <button
                    onClick={() => setViewMode('intelligent')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                      viewMode === 'intelligent'
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <LayoutGrid size={14} />
                    By Topic
                  </button>
                  <button
                    onClick={() => setViewMode('traditional')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                      viewMode === 'traditional'
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <List size={14} />
                    Timeline
                  </button>
                </div>

                <select
                  value={sortOrder}
                  onChange={e => setSortOrder(e.target.value)}
                  className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400"
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                </select>
              </div>

              {/* Search and Filter */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search your bookmarks..."
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all"
                  />
                </div>
                <select
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value)}
                  className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400"
                >
                  <option value="all">All topics</option>
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Results count when filtered */}
            {(search || categoryFilter !== 'all') && (
              <p className="text-sm text-gray-500 mb-4">
                Showing {filtered.length} of {bookmarks.length} bookmarks
                {search && ` matching "${search}"`}
                {categoryFilter !== 'all' && ` in ${categoryFilter}`}
              </p>
            )}

            {/* View */}
            {viewMode === 'intelligent' ? (
              <BookmarkIntelligentView bookmarks={filtered} onDelete={handleDelete} onViewInChat={onScrollToMessage} />
            ) : (
              <BookmarkTraditionalView bookmarks={filtered} onDelete={handleDelete} onViewInChat={onScrollToMessage} />
            )}
          </>
        ) : (
          /* Empty State */
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 mb-6">
              <Sparkles className="text-amber-500" size={32} />
            </div>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Start saving insights</h2>
            <p className="text-gray-500 max-w-sm mx-auto mb-6">
              When your Advisor shares something helpful, highlight the text or tap the bookmark icon to save it here for easy reference.
            </p>
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-100/50 p-6 max-w-md mx-auto">
              <p className="text-sm text-amber-800 font-medium mb-3">How to bookmark:</p>
              <ul className="text-sm text-amber-700/80 space-y-2 text-left">
                <li className="flex items-start gap-2">
                  <span className="inline-flex items-center justify-center w-5 h-5 bg-amber-200 rounded-full text-xs font-bold text-amber-800 mt-0.5">1</span>
                  <span>Highlight any text in an Advisor message</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="inline-flex items-center justify-center w-5 h-5 bg-amber-200 rounded-full text-xs font-bold text-amber-800 mt-0.5">2</span>
                  <span>Click "Bookmark" in the popup that appears</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="inline-flex items-center justify-center w-5 h-5 bg-amber-200 rounded-full text-xs font-bold text-amber-800 mt-0.5">3</span>
                  <span>Or tap the <Bookmark size={14} className="inline text-amber-600" /> icon on any message</span>
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
