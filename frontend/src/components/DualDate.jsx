import { fmtBs } from '../utils/nepaliDate';

/** Bikram Sambat date, e.g. "Shrawan 30, 2083" (optionally with clock time). */
export default function DualDate({ date, time }) {
  if (!date) return <span style={{ color: 'var(--color-on-surface-variant)' }}>—</span>;
  const bs = fmtBs(date);
  if (!bs) {
    const d = new Date(date);
    return <span>{Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>;
  }
  if (time) {
    const t = new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return <span>{`${bs}, ${t}`}</span>;
  }
  return <span>{bs}</span>;
}
