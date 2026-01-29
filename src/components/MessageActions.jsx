import { useState } from 'react';
import { Copy, Share2, Bookmark, Check, Archive, RefreshCw } from 'lucide-react';
import { addBookmark } from '../bookmarkStore';
import { assignCategory } from '../categoryUtils';

export default function MessageActions({
  content,
  messageIndex,
  onArchive,
  onRegenerate,
  showArchive = false,
  showRegenerate = false,
}) {
  const [copied, setCopied] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);

  // Copy to clipboard
  async function handleCopy() {
    try {
      // Clean the content for copying (remove markdown formatting)
      const cleanContent = content
        .replace(/\*\*/g, '') // Remove bold
        .replace(/\*/g, '')   // Remove italic
        .replace(/`/g, '')    // Remove code
        .replace(/\[(\d+)\]/g, '[$1]') // Keep citation markers
        .trim();

      await navigator.clipboard.writeText(cleanContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }

  // Bookmark the message
  function handleBookmark() {
    const bookmark = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      text: content,
      source: 'message',
      messageIndex,
      date: new Date().toISOString(),
      category: assignCategory(content),
    };
    addBookmark(bookmark);
    setBookmarked(true);
    setTimeout(() => setBookmarked(false), 2000);
  }

  // Share functionality
  async function handleShare(method) {
    setShowShareMenu(false);

    // Clean content for sharing
    const cleanContent = content
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/`/g, '')
      .trim();

    const shareText = `From Lockhart:\n\n${cleanContent}`;

    if (method === 'native' && navigator.share) {
      try {
        await navigator.share({
          title: 'Lockhart Advice',
          text: shareText,
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Share failed:', err);
        }
      }
    } else if (method === 'copy') {
      try {
        await navigator.clipboard.writeText(shareText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    } else if (method === 'email') {
      const subject = encodeURIComponent('Lockhart Advice');
      const body = encodeURIComponent(shareText);
      window.open(`mailto:?subject=${subject}&body=${body}`);
    } else if (method === 'sms') {
      const body = encodeURIComponent(shareText);
      window.open(`sms:?body=${body}`);
    }
  }

  return (
    <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
      {/* Regenerate Button */}
      {showRegenerate && onRegenerate && (
        <button
          onClick={onRegenerate}
          className="p-1.5 rounded-md text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
          title="Regenerate response"
        >
          <RefreshCw size={14} />
        </button>
      )}

      {/* Copy Button */}
      <button
        onClick={handleCopy}
        className={`p-1.5 rounded-md transition-colors ${
          copied
            ? 'bg-emerald-100 text-emerald-600'
            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
        }`}
        title={copied ? 'Copied!' : 'Copy'}
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>

      {/* Share Button */}
      <div className="relative">
        <button
          onClick={() => setShowShareMenu(!showShareMenu)}
          className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          title="Share"
        >
          <Share2 size={14} />
        </button>

        {showShareMenu && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowShareMenu(false)}
            />
            <div className="absolute bottom-full left-0 mb-1 z-20 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[140px]">
              {navigator.share && (
                <button
                  onClick={() => handleShare('native')}
                  className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Share...
                </button>
              )}
              <button
                onClick={() => handleShare('copy')}
                className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Copy for sharing
              </button>
              <button
                onClick={() => handleShare('email')}
                className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Email
              </button>
              <button
                onClick={() => handleShare('sms')}
                className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Text message
              </button>
            </div>
          </>
        )}
      </div>

      {/* Bookmark Button */}
      <button
        onClick={handleBookmark}
        className={`p-1.5 rounded-md transition-colors ${
          bookmarked
            ? 'bg-amber-100 text-amber-600'
            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
        }`}
        title={bookmarked ? 'Bookmarked!' : 'Bookmark'}
      >
        <Bookmark size={14} className={bookmarked ? 'fill-amber-600' : ''} />
      </button>

      {/* Archive Button (optional) */}
      {showArchive && onArchive && (
        <button
          onClick={onArchive}
          className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          title="Archive message"
        >
          <Archive size={14} />
        </button>
      )}
    </div>
  );
}
