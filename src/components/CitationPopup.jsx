import { useEffect, useRef } from 'react';
import { X, ExternalLink, BookOpen } from 'lucide-react';

export default function CitationPopup({ citation, num, position, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        onClose();
      }
    }
    function handleEsc(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  if (!citation) return null;

  // Calculate position to keep popup in viewport
  const style = {
    position: 'fixed',
    left: `${Math.min(position.x, window.innerWidth - 340)}px`,
    top: `${Math.min(position.y + 10, window.innerHeight - 300)}px`,
    zIndex: 100,
  };

  return (
    <div
      ref={ref}
      className="w-80 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      style={style}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-50 to-accent-50 px-4 py-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-white rounded-lg shadow-sm">
            <BookOpen size={14} className="text-primary-600" />
          </div>
          <span className="text-xs font-semibold text-primary-700">Source [{num}]</span>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Title */}
        <h4 className="text-sm font-semibold text-gray-900 leading-snug">
          {citation.title}
        </h4>

        {/* Authors & Journal */}
        {(citation.authors || citation.journal) && (
          <p className="text-xs text-gray-500">
            {citation.authors}
            {citation.authors && citation.journal && ' · '}
            {citation.journal}
          </p>
        )}

        {/* Key Quote */}
        {citation.quote && (
          <div className="bg-amber-50 border-l-3 border-amber-400 px-3 py-2 rounded-r-lg">
            <p className="text-xs text-gray-700 italic leading-relaxed">
              "{citation.quote}"
            </p>
            <p className="text-xs text-amber-600 font-medium mt-1">Key finding supporting this point</p>
          </div>
        )}

        {/* Link */}
        {citation.url && (
          <a
            href={citation.url.startsWith('http') ? citation.url : `https://doi.org/${citation.url}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors"
          >
            <ExternalLink size={12} />
            View full study
          </a>
        )}
      </div>
    </div>
  );
}
