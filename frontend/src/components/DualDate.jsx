import React from 'react';
import { fmtDate } from '../utils/helpers';
import { fmtBs } from '../utils/nepaliDate';

/** Bikram Sambat date with the Gregorian date stacked beneath it. */
export default function DualDate({ date, time }) {
  if (!date) return <span style={{ color: 'var(--color-on-surface-variant)' }}>—</span>;
  const bs = fmtBs(date);
  return (
    <span className="dual-date">
      {bs && <span className="dual-date-bs">{bs}</span>}
      <span className="dual-date-ad">{time ? fmtDateTimeLocal(date) : fmtDate(date)}</span>
    </span>
  );
}

function fmtDateTimeLocal(dateStr) {
  const d = new Date(dateStr);
  return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}
