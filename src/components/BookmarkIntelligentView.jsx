import { useState } from 'react';
import { Trash2, ChevronDown, ChevronUp, ExternalLink, Dumbbell, Apple, Moon, Brain, Droplets, Lightbulb, Quote } from 'lucide-react';
import { CATEGORIES } from '../categoryUtils';
import { formatText } from '../citationParser';

const CATEGORY_CONFIG = {
  fitness: {
    icon: Dumbbell,
    gradient: 'from-blue-500 to-indigo-500',
    bg: 'bg-blue-50',
    border: 'border-blue-100',
    text: 'text-blue-700',
    badge: 'bg-blue-100 text-blue-700',
    label: 'Fitness',
  },
  diet: {
    icon: Apple,
    gradient: 'from-emerald-500 to-green-500',
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
    text: 'text-emerald-700',
    badge: 'bg-emerald-100 text-emerald-700',
    label: 'Diet & Nutrition',
  },
  sleep: {
    icon: Moon,
    gradient: 'from-indigo-500 to-purple-500',
    bg: 'bg-indigo-50',
    border: 'border-indigo-100',
    text: 'text-indigo-700',
    badge: 'bg-indigo-100 text-indigo-700',
    label: 'Sleep',
  },
  stress: {
    icon: Brain,
    gradient: 'from-amber-500 to-orange-500',
    bg: 'bg-amber-50',
    border: 'border-amber-100',
    text: 'text-amber-700',
    badge: 'bg-amber-100 text-amber-700',
    label: 'Stress & Mental',
  },
  hydration: {
    icon: Droplets,
    gradient: 'from-cyan-500 to-blue-500',
    bg: 'bg-cyan-50',
    border: 'border-cyan-100',
    text: 'text-cyan-700',
    badge: 'bg-cyan-100 text-cyan-700',
    label: 'Hydration',
  },
  general: {
    icon: Lightbulb,
    gradient: 'from-gray-500 to-slate-500',
    bg: 'bg-gray-50',
    border: 'border-gray-100',
    text: 'text-gray-700',
    badge: 'bg-gray-100 text-gray-700',
    label: 'General',
  },
};

export default function BookmarkIntelligentView({ bookmarks, onDelete, onViewInChat }) {
  const [expanded, setExpanded] = useState({});

  const grouped = CATEGORIES.reduce((acc, cat) => {
    const items = bookmarks.filter(b => b.category === cat);
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {});

  const activeCategories = Object.keys(grouped);

  if (activeCategories.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
          <Lightbulb className="text-gray-400" size={24} />
        </div>
        <p className="text-gray-500">No bookmarks match your search.</p>
      </div>
    );
  }

  function toggleExpand(id) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div className="space-y-8">
      {/* Quick Jump TOC */}
      <div className="flex flex-wrap gap-2">
        {activeCategories.map(cat => {
          const config = CATEGORY_CONFIG[cat];
          const Icon = config.icon;
          return (
            <a
              key={cat}
              href={`#bm-cat-${cat}`}
              className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-full font-medium transition-all hover:scale-105 ${config.badge}`}
            >
              <Icon size={12} />
              {config.label}
              <span className="opacity-60">({grouped[cat].length})</span>
            </a>
          );
        })}
      </div>

      {/* Category Sections */}
      {activeCategories.map(cat => {
        const config = CATEGORY_CONFIG[cat];
        const Icon = config.icon;
        return (
          <div key={cat} id={`bm-cat-${cat}`} className="scroll-mt-32">
            {/* Category Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2 rounded-lg bg-gradient-to-br ${config.gradient} shadow-sm`}>
                <Icon size={18} className="text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{config.label}</h3>
                <p className="text-xs text-gray-500">{grouped[cat].length} saved insight{grouped[cat].length !== 1 ? 's' : ''}</p>
              </div>
            </div>

            {/* Bookmark Cards */}
            <div className="space-y-3 pl-2 border-l-2 border-gray-100 ml-4">
              {grouped[cat].map(b => {
                const isLong = b.text.length > 200;
                const isExpanded = expanded[b.id];
                const displayText = isLong && !isExpanded ? b.text.slice(0, 200) + '...' : b.text;
                return (
                  <div
                    key={b.id}
                    className={`bg-white rounded-xl border shadow-sm hover:shadow-md transition-all overflow-hidden ${config.border}`}
                  >
                    <div className="p-4">
                      {/* Saved insight header */}
                      <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
                        <Quote size={12} />
                        <span>{b.source === 'selection' ? 'Highlighted passage' : 'Full response saved'}</span>
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

                    {/* Card Footer */}
                    <div className={`px-4 py-2.5 ${config.bg} flex items-center justify-between`}>
                      <span className="text-xs text-gray-500">
                        {new Date(b.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <div className="flex items-center gap-1">
                        {b.messageIndex !== undefined && (
                          <button
                            onClick={() => onViewInChat?.(b.messageIndex)}
                            className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md ${config.text} hover:bg-white/50 transition-colors`}
                          >
                            <ExternalLink size={12} />
                            View in chat
                          </button>
                        )}
                        <button
                          onClick={() => onDelete(b.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-white/50 rounded-md transition-colors"
                          title="Delete bookmark"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
