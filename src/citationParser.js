import React from 'react';

// Highlight categories with colors and labels
export const HIGHLIGHT_CATEGORIES = {
  action: {
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    hoverColor: 'hover:bg-emerald-200',
    label: 'Action Item',
    emoji: '✅',
  },
  key: {
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    hoverColor: 'hover:bg-blue-200',
    label: 'Key Point',
    emoji: '🎯',
  },
  warning: {
    color: 'bg-amber-100 text-amber-800 border-amber-200',
    hoverColor: 'hover:bg-amber-200',
    label: 'Important Note',
    emoji: '⚠️',
  },
  science: {
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    hoverColor: 'hover:bg-purple-200',
    label: 'Research Insight',
    emoji: '🔬',
  },
  goal: {
    color: 'bg-teal-100 text-teal-800 border-teal-200',
    hoverColor: 'hover:bg-teal-200',
    label: 'Goal/Target',
    emoji: '🏆',
  },
  tip: {
    color: 'bg-pink-100 text-pink-800 border-pink-200',
    hoverColor: 'hover:bg-pink-200',
    label: 'Pro Tip',
    emoji: '💡',
  },
};

// Parse highlights from text
// Format: [[HL:category:rationale]]highlighted text[[/HL]]
export function parseHighlights(text) {
  const highlights = [];
  const regex = /\[\[HL:(\w+):([^\]]+)\]\](.+?)\[\[\/HL\]\]/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    highlights.push({
      category: match[1],
      rationale: match[2],
      text: match[3],
      start: match.index,
      end: regex.lastIndex,
      fullMatch: match[0],
    });
  }

  return highlights;
}

// Strip highlight markers from text (for clean display)
export function stripHighlights(text) {
  return text.replace(/\[\[HL:\w+:[^\]]+\]\](.+?)\[\[\/HL\]\]/g, '$1');
}

// Parses citations from assistant messages
// Format: inline [1], [2], etc. with a [[CITATIONS]] block at end

export function parseCitations(text) {
  if (!text) return { text: '', cleanText: '', citations: {} };
  const citationBlockMatch = text.match(/\[\[CITATIONS\]\]([\s\S]*?)\[\[\/CITATIONS\]\]/);

  if (!citationBlockMatch) {
    return { cleanText: text, citations: {} };
  }

  const cleanText = text.replace(/\[\[CITATIONS\]\][\s\S]*?\[\[\/CITATIONS\]\]/, '').trim();
  const citationBlock = citationBlockMatch[1];
  const citations = {};

  // Parse each citation line: [1] Title | Authors, Year | "Quote" | Journal | URL
  const lines = citationBlock.split('\n').filter(l => l.trim());

  for (const line of lines) {
    const match = line.match(/^\[(\d+)\]\s*(.+)$/);
    if (!match) continue;

    const num = match[1];
    const parts = match[2].split('|').map(p => p.trim());

    citations[num] = {
      title: parts[0] || '',
      authors: parts[1] || '',
      quote: (parts[2] || '').replace(/^[""]|[""]$/g, ''),
      journal: parts[3] || '',
      url: parts[4] || '',
    };
  }

  return { cleanText, citations };
}

// Formats inline text with markdown-like syntax (bold, italic, underline), highlights, and citations
function formatInlineText(text, onHighlightHover, onHighlightLeave, citations, onCitationClick, keyPrefix = '') {
  if (!text) return text;

  const elements = [];
  let key = 0;

  // Combined pattern for highlights, bold, italic, underline, and inline citations
  const pattern = /(\[\[HL:(\w+):([^\]]+)\]\](.+?)\[\[\/HL\]\])|(\*\*(.+?)\*\*)|(\*(.+?)\*)|(__(.+?)__)|(\[(\d+)\])/g;
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      elements.push(text.slice(lastIndex, match.index));
    }

    if (match[1]) {
      // Highlight
      const category = match[2];
      const rationale = match[3];
      const highlightedText = match[4];
      const config = HIGHLIGHT_CATEGORIES[category] || HIGHLIGHT_CATEGORIES.key;

      elements.push(
        React.createElement('span', {
          key: `${keyPrefix}${key++}`,
          className: `inline px-1 py-0.5 rounded border cursor-pointer transition-colors ${config.color} ${config.hoverColor}`,
          onMouseEnter: (e) => onHighlightHover?.(e, { category, rationale, text: highlightedText, config }),
          onMouseLeave: () => onHighlightLeave?.(),
        }, highlightedText)
      );
    } else if (match[5]) {
      // Bold
      elements.push(React.createElement('strong', { key: `${keyPrefix}${key++}`, className: 'font-semibold' }, match[6]));
    } else if (match[7]) {
      // Italic
      elements.push(React.createElement('em', { key: `${keyPrefix}${key++}`, className: 'italic' }, match[8]));
    } else if (match[9]) {
      // Underline
      elements.push(React.createElement('u', { key: `${keyPrefix}${key++}`, className: 'underline' }, match[10]));
    } else if (match[11]) {
      // Citation marker [1], [2], etc.
      const num = match[12];
      const hasCitation = citations && citations[num];
      elements.push(
        React.createElement('button', {
          key: `${keyPrefix}cit-${key++}`,
          className: `citation-marker inline-flex items-center justify-center w-4 h-4 text-[10px] font-medium ${
            hasCitation
              ? 'bg-primary-100 text-primary-700 hover:bg-primary-200 cursor-pointer'
              : 'bg-gray-200 text-gray-600 cursor-help'
          } rounded-full transition-colors mx-0.5`,
          onClick: hasCitation ? (e) => {
            e.stopPropagation();
            onCitationClick?.(e, num);
          } : undefined,
          title: hasCitation ? `View source [${num}]: ${citations[num].title}` : `Reference [${num}]`,
        }, num)
      );
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    elements.push(text.slice(lastIndex));
  }

  return elements.length > 0 ? elements : text;
}

// Formats text with markdown-like syntax including block elements
export function formatText(text, onHighlightHover, onHighlightLeave, citations = {}, onCitationClick = null) {
  if (!text) return text;

  // Normalize excessive newlines (3+ newlines become 2)
  text = text.replace(/\n{3,}/g, '\n\n');

  const lines = text.split('\n');
  const elements = [];
  let key = 0;
  let inList = false;
  let listItems = [];
  let listType = null; // 'bullet' or 'number'

  const flushList = () => {
    if (listItems.length > 0) {
      const ListTag = listType === 'number' ? 'ol' : 'ul';
      const listClass = listType === 'number'
        ? 'list-decimal list-inside space-y-1 my-2 ml-1'
        : 'list-disc list-inside space-y-1 my-2 ml-1';
      elements.push(
        React.createElement(ListTag, { key: key++, className: listClass },
          listItems.map((item, i) => React.createElement('li', { key: i, className: 'text-gray-700' }, item))
        )
      );
      listItems = [];
      listType = null;
      inList = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Headers: ## Header or ### Header
    if (trimmedLine.match(/^#{2,3}\s+/)) {
      flushList();
      const headerText = trimmedLine.replace(/^#{2,3}\s+/, '');
      const isH2 = trimmedLine.startsWith('## ');
      elements.push(
        React.createElement(isH2 ? 'h3' : 'h4', {
          key: key++,
          className: isH2
            ? 'font-semibold text-gray-900 mt-4 mb-2 first:mt-0'
            : 'font-medium text-gray-800 mt-3 mb-1.5'
        }, formatInlineText(headerText, onHighlightHover, onHighlightLeave, citations, onCitationClick, `h${key}`))
      );
      continue;
    }

    // Bullet points: - item or * item
    if (trimmedLine.match(/^[-*]\s+/)) {
      if (listType !== 'bullet') {
        flushList();
        listType = 'bullet';
      }
      inList = true;
      const itemText = trimmedLine.replace(/^[-*]\s+/, '');
      listItems.push(formatInlineText(itemText, onHighlightHover, onHighlightLeave, citations, onCitationClick, `li${key}${listItems.length}`));
      continue;
    }

    // Numbered lists: 1. item or 1) item
    if (trimmedLine.match(/^\d+[.)]\s+/)) {
      if (listType !== 'number') {
        flushList();
        listType = 'number';
      }
      inList = true;
      const itemText = trimmedLine.replace(/^\d+[.)]\s+/, '');
      listItems.push(formatInlineText(itemText, onHighlightHover, onHighlightLeave, citations, onCitationClick, `li${key}${listItems.length}`));
      continue;
    }

    // Empty line
    if (trimmedLine === '') {
      flushList();
      // Only add spacing if not at start and previous wasn't also empty
      if (elements.length > 0) {
        const lastEl = elements[elements.length - 1];
        if (typeof lastEl !== 'string' || lastEl.trim() !== '') {
          elements.push(React.createElement('div', { key: key++, className: 'h-2' }));
        }
      }
      continue;
    }

    // Regular paragraph
    flushList();
    elements.push(
      React.createElement('p', { key: key++, className: 'my-1.5 first:mt-0 last:mb-0' },
        formatInlineText(line, onHighlightHover, onHighlightLeave, citations, onCitationClick, `p${key}`)
      )
    );
  }

  flushList();
  return elements.length > 0 ? elements : text;
}

// Renders text/elements with citation markers as clickable elements
export function renderWithCitations(content, citations, onCitationClick) {
  // If content is already React elements (from formatText), we need to process them
  if (Array.isArray(content)) {
    return content.map((element, idx) => {
      if (typeof element === 'string') {
        return renderStringWithCitations(element, citations, onCitationClick, `arr-${idx}-`);
      }
      // React element - return as is (citations are typically in text nodes)
      return element;
    });
  }

  // If content is a string, process it directly
  if (typeof content === 'string') {
    return renderStringWithCitations(content, citations, onCitationClick, '');
  }

  // Fallback - return as is
  return content;
}

// Helper to render a string with citation markers
function renderStringWithCitations(text, citations, onCitationClick, keyPrefix) {
  const parts = [];
  let lastIndex = 0;
  const regex = /\[(\d+)\]/g;
  let match;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    // Add text before citation
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    // Add citation marker as clickable element
    const num = match[1];
    parts.push(
      React.createElement('button', {
        key: `${keyPrefix}cit-${key++}`,
        className: 'citation-marker inline-flex items-center justify-center w-4 h-4 text-[10px] font-medium bg-primary-100 text-primary-700 rounded-full hover:bg-primary-200 transition-colors mx-0.5 cursor-pointer',
        onClick: (e) => onCitationClick?.(e, num),
      }, num)
    );
    lastIndex = regex.lastIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}
