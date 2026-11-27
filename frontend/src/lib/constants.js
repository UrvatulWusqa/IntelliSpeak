export const SKILL_LEVELS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

export const PRESENTATION_GOALS = [
  { value: 'speech_delivery', label: 'Speech delivery' },
  { value: 'body_language', label: 'Body language' },
  { value: 'content_clarity', label: 'Content clarity' },
  { value: 'audience_engagement', label: 'Audience engagement' },
  { value: 'pacing_and_pauses', label: 'Pacing and pauses' },
];

// Allowed range is enforced in the database too (15 to 1440 minutes).
export const COOLDOWN_OPTIONS = [
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' },
  { value: 120, label: '2 hours' },
  { value: 240, label: '4 hours' },
  { value: 360, label: '6 hours' },
  { value: 720, label: '12 hours (recommended)' },
  { value: 1440, label: '24 hours' },
];

// UI-3.1: sidebar order.
export const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: '▦' },
  { to: '/practice', label: 'AI Practice', icon: '✦' },
  { to: '/exercises', label: 'Exercises', icon: '◎' },
  { to: '/upload', label: 'Upload Recording', icon: '⇪' },
  { to: '/analysis', label: 'Analysis & Feedback', icon: '◔' },
  { to: '/history', label: 'History', icon: '☰' },
  { to: '/profile', label: 'Profile', icon: '◉' },
];

export function initials(name, email) {
  const source = (name || '').trim() || (email || '').split('@')[0] || '?';
  const parts = source.split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : source.slice(0, 2);
  return letters.toUpperCase();
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
