const NOTE_REGEX = /\[\[NOTE:(\w+)\]\]\s*([\s\S]*?)\s*\[\[\/NOTE\]\]/g;

export function extractNotes(message) {
  const notes = [];
  let match;
  while ((match = NOTE_REGEX.exec(message)) !== null) {
    notes.push({ section: match[1], text: match[2].trim() });
  }
  NOTE_REGEX.lastIndex = 0;
  return notes;
}

export function stripNotes(message) {
  const cleaned = message.replace(NOTE_REGEX, '').replace(/\n{3,}/g, '\n\n').trim();
  NOTE_REGEX.lastIndex = 0;
  return cleaned;
}
