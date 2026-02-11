/**
 * Input sanitization utilities
 * Prevents XSS and other injection attacks
 */

/**
 * Escape HTML entities to prevent XSS
 */
export function escapeHtml(text) {
  if (!text || typeof text !== 'string') return text;

  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };

  return text.replace(/[&<>"']/g, char => map[char]);
}

/**
 * Sanitize user input for safe display
 * Removes script tags and dangerous attributes
 */
export function sanitizeInput(input) {
  if (!input || typeof input !== 'string') return input;

  // Remove script tags
  let clean = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove onclick, onerror, and other event handlers
  clean = clean.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');

  // Remove javascript: URLs
  clean = clean.replace(/javascript:/gi, '');

  // Remove data: URLs (can be used for XSS)
  clean = clean.replace(/data:/gi, '');

  return clean;
}

/**
 * Sanitize filename for safe file operations
 */
export function sanitizeFilename(filename) {
  if (!filename || typeof filename !== 'string') return 'file';

  // Remove path traversal attempts
  let clean = filename.replace(/\.\./g, '');

  // Remove invalid filename characters
  clean = clean.replace(/[<>:"/\\|?*\x00-\x1F]/g, '');

  // Limit length
  if (clean.length > 255) {
    const ext = clean.split('.').pop();
    clean = clean.substring(0, 250 - ext.length) + '.' + ext;
  }

  return clean || 'file';
}

/**
 * Validate and sanitize URL
 */
export function sanitizeUrl(url) {
  if (!url || typeof url !== 'string') return null;

  try {
    const parsed = new URL(url);

    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }

    return parsed.href;
  } catch {
    return null;
  }
}

/**
 * Sanitize object keys and string values recursively
 */
export function sanitizeObject(obj) {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    return sanitizeInput(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  if (typeof obj === 'object') {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      // Sanitize key as well
      const cleanKey = key.replace(/[<>"'&]/g, '');
      result[cleanKey] = sanitizeObject(value);
    }
    return result;
  }

  return obj;
}
