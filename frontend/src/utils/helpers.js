import { fmtBs } from './nepaliDate';

/** Read the current user from localStorage; returns {} when absent. */
export function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}');
  } catch {
    return {};
  }
}

/** Extract the server-provided error message from an axios error, with a fallback. */
export function getApiMessage(err, fallback = 'Something went wrong') {
  if (!err) return fallback;
  return (
    err.response?.data?.error ||
    err.response?.data?.message ||
    err.message ||
    fallback
  );
}

/** Compact relative timestamp ("just now", "5m ago", "2d ago"), falling back to BS. */
export function timeAgo(dateStr) {
  const d = new Date(dateStr);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return fmtBs(dateStr) || d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Format as Nepali BS date (e.g. "Bhadra 6, 2083"), falling back to AD format. */
export function fmtDate(dateStr) {
  if (!dateStr) return '—';
  const bs = fmtBs(dateStr);
  if (bs) return bs;
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Format as Nepali BS date + time (e.g. "Bhadra 6, 2083, 14:05"). */
export function fmtDateTime(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const isValid = !Number.isNaN(d.getTime());
  const bs = fmtBs(dateStr);
  const timeStr = isValid ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
  if (bs) return timeStr ? `${bs}, ${timeStr}` : bs;
  return isValid ? `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}, ${timeStr}` : '—';
}

export default { getCurrentUser, getApiMessage, timeAgo, fmtDate, fmtDateTime };
