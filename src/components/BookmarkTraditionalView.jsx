import { useState } from 'react';
import { Trash2, ExternalLink, ChevronDown, ChevronUp, Dumbbell, Apple, Moon, Brain, Droplets, Lightbulb, Calendar, Quote } from 'lucide-react';
import { formatText } from '../citationParser';

const CATEGORY_CONFIG = {
  fitness: {
    icon: Dumbbell,
    gradient: 'from-blue-500 to-indigo-500',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    badge: 'bg-blue-100 text-blue-700',
  },
  diet: {
    icon: Apple,
    gradient: 'from-emerald-500 to-green-500',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    badge: 'bg-emerald-100 text-emerald-700',
  },
  sleep: {
    icon: Moon,
    gradient: 'from-indigo-500 to-purple-500',
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    badge: 'bg-indigo-100 text-indigo-700',
  },
  stress: {
    icon: Brain,
    gradient: 'from-amber-500 to-orange-500',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    badge: 'bg-amber-100 text-amber-700',
  },
  hydration: {
    icon: Droplets,
    gradient: 'from-cyan-500 to-blue-500',
    bg: 'bg-cyan-50',
    text: 'text-cyan-700',
    badge: 'bg-cyan-100 text-cyan-700',
  },
  general: {
    icon: Lightbulb,
    gradient: 'from-gray-500 to-slate-500',
    bg: 'bg-gray-50',
    text: 'text-gray-700',
    badge: 'bg-gray-100 text-gray-700',
  },
};

export default function BookmarkTraditionalView({ bookmarks, onDelete, onViewInChat }) {
  const [expanded, setExpanded] = useState({});

  if (bookmarks.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
          <Calendar className="text-gray-400" size={24} />
        </div>
        <p className="text-gray-500">No bookmarks match your search.</p>
      </div>
    );
  }

  function toggleExpand(id) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  }

  // Group by date
  const groupedByDate = bookmarks.reduce((acc, b) => {
    const dateKey = new Date(b.date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(b);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {Object.entries(groupedByDate).map(([dateKey, items]) => (
        <div key={dateKey}>
          {/* Date Header */}
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={14} className="text-gray-400" />
            <span className="text-sm font-medium text-gray-600">{dateKey}</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* Cards for this date */}
          <div className="space-y-3">
            {items.map(b => {
              const config = CATEGORY_CONFIG[b.category] || CATEGORY_CONFIG.general;
              const Icon = config.icon;
              const isLong = b.text.length > 250;
              const isExpanded = expanded[b.id];
              const displayText = isLong && !isExpanded ? b.text.slice(0, 250) + '...' : b.text;

              return (
                <div
                  key={b.id}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden"
                >
                  {/* Category indicator strip */}
                  <div className={`h-1 bg-gradient-to-r ${config.gradient}`} />

                  <div className="p-4">
                    {/* Category badge and saved insight header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${config.badge}`}>
                          <Icon size={12} />
                          {b.category.charAt(0).toUpperCase() + b.category.slice(1)}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(b.date).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <Quote size={11} />
                        <span>{b.source === 'selection' ? 'Highlighted passage' : 'Full response'}</span>
                      </div>
                    </div>

                    {/* Formatted content */}
                    <div className="text-sm text-gray-700 leading-relaxed">
                      {formatText(displayText)}
                    </div>

                    {isLong && (
                      <button
                        onClick={() => toggleExpand(b.id)}
                        className={`flex items-center gap-1 mt-2 text-xs font-medium ${config.text} hover:opacity-80`}
                      >
                        {isExpanded ? <><ChevronUp size={14} /> Show less</> : <><ChevronDown size={14} /> Read more</>}
                      </button>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="px-4 py-2.5 bg-gray-50 flex items-center justify-end gap-2">
                    {b.messageIndex !== undefined && (
                      <button
                        onClick={() => onViewInChat?.(b.messageIndex)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-primary-600 hover:bg-white rounded-lg transition-colors"
                      >
                        <ExternalLink size={12} />
                        View in chat
                      </button>
                    )}
                    <button
                      onClick={() => onDelete(b.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-red-500 hover:bg-white rounded-lg transition-colors"
                      title="Delete bookmark"
                    >
                      <Trash2 size={12} />
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
