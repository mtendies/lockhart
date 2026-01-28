import { useEffect, useRef } from 'react';
import { Bookmark } from 'lucide-react';

export default function TextSelectionPopup({ x, y, onBookmark, onDismiss }) {
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        onDismiss();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onDismiss]);

  // Calculate position with viewport boundary checking
  const popupWidth = 100; // Approximate popup width
  const popupHeight = 36; // Approximate popup height
  const padding = 8;

  // Clamp x to keep popup in viewport
  const clampedX = Math.max(popupWidth / 2 + padding, Math.min(x, window.innerWidth - popupWidth / 2 - padding));

  // If popup would go above viewport, show below selection instead
  const showBelow = y < popupHeight + padding;
  const clampedY = showBelow ? y + 20 : y;

  return (
    <div
      ref={ref}
      className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg px-2 py-1.5 flex items-center gap-1.5 animate-in fade-in"
      style={{
        left: `${clampedX}px`,
        top: `${clampedY}px`,
        transform: showBelow ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
      }}
    >
      <button
        onClick={onBookmark}
        className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-700 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
      >
        <Bookmark size={12} />
        Bookmark
      </button>
    </div>
  );
}
