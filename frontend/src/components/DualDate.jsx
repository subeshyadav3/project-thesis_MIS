import { fmtBs, parseAdDate } from '../utils/nepaliDate';

/** Bikram Sambat date, e.g. "Bhadra 6, 2083" (optionally with clock time). */
export default function DualDate({ date, time, showAd = false }) {
  if (!date) return <span style={{ color: 'var(--color-on-surface-variant)' }}>—</span>;
  const bs = fmtBs(date);
  const d = parseAdDate(date);
  const isValid = d !== null;

  if (!bs) {
    return <span>{isValid ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</span>;
  }

  const timeStr = (time && isValid) ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
  const displayBs = timeStr ? `${bs}, ${timeStr}` : bs;

  if (showAd && isValid) {
    const adStr = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    return (
      <span className="dual-date" title={`BS: ${displayBs} | AD: ${adStr}`}>
        <span className="dual-date-bs">{displayBs}</span>
        <span className="dual-date-ad">({adStr})</span>
      </span>
    );
  }

  const tooltip = isValid ? `AD: ${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : undefined;
  return <span title={tooltip}>{displayBs}</span>;
}
