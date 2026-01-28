import { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';

export default function ChatSearchPopup({ messages, onSelect, onClose }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Helper to extract text from message content (handles both string and object formats)
  const getMessageText = (msg) => {
    if (!msg || !msg.content) return '';
    return typeof msg.content === 'string'
      ? msg.content
      : (msg.content?.content || msg.content?.text || '');
  };

  const results = query.trim().length < 2 ? [] : messages
    .map((msg, i) => ({ msg, index: i, text: getMessageText(msg) }))
    .filter(({ msg, text }) => msg.role === 'assistant' && text.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 5)
    .map(({ text, index }) => {
      const lower = text.toLowerCase();
      const matchPos = lower.indexOf(query.toLowerCase());
      const start = Math.max(0, matchPos - 30);
      const end = Math.min(text.length, matchPos + query.length + 50);
      const snippet = (start > 0 ? '...' : '') + text.slice(start, end) + (end < text.length ? '...' : '');
      return { index, snippet };
    });

  return (
    <div className="absolute top-[52px] left-0 right-0 z-20 bg-white border-b border-gray-200 shadow-lg">
      <div className="max-w-3xl mx-auto px-4 py-3">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search messages..."
            className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors">
            <X size={16} />
          </button>
        </div>
        {results.length > 0 && (
          <div className="mt-2 space-y-1">
            {results.map(r => (
              <button
                key={r.index}
                onClick={() => onSelect(r.index)}
                className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-primary-50 hover:text-primary-700 transition-colors truncate"
              >
                {r.snippet}
              </button>
            ))}
          </div>
        )}
        {query.trim().length >= 2 && results.length === 0 && (
          <p className="mt-2 text-sm text-gray-400 px-1">No matches found.</p>
        )}
      </div>
    </div>
  );
}
