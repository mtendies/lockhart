import { useRef, useEffect, useCallback } from 'react';
import { Bold, Italic, List } from 'lucide-react';

export default function RichTextArea({ value, onChange, hint, minRows = 4 }) {
  const editorRef = useRef(null);
  const isUpdating = useRef(false);

  // Sync external value changes
  useEffect(() => {
    if (editorRef.current && !isUpdating.current) {
      if (editorRef.current.innerHTML !== (value || '')) {
        editorRef.current.innerHTML = value || '';
      }
    }
  }, [value]);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      isUpdating.current = true;
      onChange(editorRef.current.innerHTML);
      requestAnimationFrame(() => { isUpdating.current = false; });
    }
  }, [onChange]);

  function execCmd(command, val = null) {
    document.execCommand(command, false, val);
    editorRef.current?.focus();
    handleInput();
  }

  function handleKeyDown(e) {
    if (e.key === 'b' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      execCmd('bold');
    } else if (e.key === 'i' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      execCmd('italic');
    }
  }

  const isEmpty = !value || value === '<br>' || value === '<div><br></div>';
  const minHeight = `${minRows * 1.75}rem`;

  return (
    <div className="space-y-1.5">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-1">
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={() => execCmd('bold')}
          className="p-2.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
          title="Bold (Cmd+B)"
        >
          <Bold size={14} />
        </button>
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={() => execCmd('italic')}
          className="p-2.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
          title="Italic (Cmd+I)"
        >
          <Italic size={14} />
        </button>
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={() => execCmd('insertUnorderedList')}
          className="p-2.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
          title="Bullet list"
        >
          <List size={14} />
        </button>
      </div>

      {/* Editor */}
      <div className="relative">
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all text-sm leading-relaxed overflow-visible [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4 [&_b]:font-semibold [&_i]:italic"
          style={{ minHeight }}
          suppressContentEditableWarning
        />
        {isEmpty && (
          <div className="absolute top-3 left-4 text-gray-300 text-sm pointer-events-none">
            Start typing...
          </div>
        )}
      </div>

      {/* Persistent hint */}
      {hint && (
        <p className="text-xs text-gray-400 px-1 leading-relaxed">{hint}</p>
      )}
    </div>
  );
}
