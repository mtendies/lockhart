/**
 * ExpandingTextarea
 * A textarea that automatically expands to fit its content.
 * - Expands on typing
 * - Properly sizes on initial render (for pre-filled values)
 * - Optional max height
 * - No text truncation
 */

import { useRef, useEffect } from 'react';

export default function ExpandingTextarea({
  value,
  onChange,
  placeholder,
  className = '',
  disabled = false,
  rows = 1,
  maxHeight = 300,
  ...props
}) {
  const textareaRef = useRef(null);

  // Auto-size on value change (including initial load)
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = Math.min(scrollHeight, maxHeight) + 'px';
    }
  }, [value, maxHeight]);

  function handleChange(e) {
    onChange(e.target.value);
    // Also resize on change for immediate feedback
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, maxHeight) + 'px';
  }

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      disabled={disabled}
      rows={rows}
      className={`resize-none ${className}`}
      {...props}
    />
  );
}
