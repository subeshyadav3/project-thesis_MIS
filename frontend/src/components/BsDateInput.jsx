import React, { useState, useRef, useEffect } from 'react';
import { Icon } from './ui';
import useClickOutside from '../hooks/useClickOutside';
import {
  toBs,
  fmtBs,
  bsToAd,
  getDaysInBsMonth,
  getBsMonthFirstDay,
  getTodayBs,
  BS_MONTHS,
  BS_DAYS_SHORT
} from '../utils/nepaliDate';

const MIN_YEAR = 2070;
const MAX_YEAR = 2090;
const YEARS = Array.from({ length: MAX_YEAR - MIN_YEAR + 1 }, (_, i) => MIN_YEAR + i);

/**
 * Full interactive Nepali Calendar Date Picker (Bikram Sambat).
 * Stores and emits standard AD dates ('YYYY-MM-DD') for API compatibility while
 * allowing users to pick and view dates entirely in Nepali BS calendar.
 */
export default function BsDateInput({
  value,
  onChange,
  className = '',
  style = {},
  placeholder = 'Select Nepali Date (BS)',
  disabled = false,
  required = false,
  name,
  id,
  title,
  min,
  max,
}) {
  const containerRef = useRef(null);
  const [open, setOpen] = useState(false);

  // Parse current value into BS representation
  const selectedBs = value ? toBs(value) : null;
  const todayBs = getTodayBs();

  // Calendar navigation state (year & month index 0-11)
  const [viewYear, setViewYear] = useState(() => selectedBs?.getYear() || todayBs.year);
  const [viewMonth, setViewMonth] = useState(() => selectedBs !== null ? selectedBs.getMonth() : todayBs.month);

  // Sync calendar view when value prop changes or modal opens
  useEffect(() => {
    if (value) {
      const bs = toBs(value);
      if (bs) {
        setViewYear(bs.getYear());
        setViewMonth(bs.getMonth());
      }
    }
  }, [value, open]);

  // Close calendar on outside click
  useClickOutside(containerRef, () => setOpen(false));

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const handlePrevMonth = (e) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      if (viewYear > MIN_YEAR) {
        setViewYear(y => y - 1);
        setViewMonth(11);
      }
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const handleNextMonth = (e) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      if (viewYear < MAX_YEAR) {
        setViewYear(y => y + 1);
        setViewMonth(0);
      }
    } else {
      setViewMonth(m => m + 1);
    }
  };

  const handleSelectDay = (dayNum, e) => {
    e.stopPropagation();
    if (disabled) return;
    const adDateStr = bsToAd(viewYear, viewMonth, dayNum);
    if (adDateStr) {
      onChange?.({
        target: {
          name: name || id || 'date',
          value: adDateStr
        }
      });
      setOpen(false);
    }
  };

  const handleSelectToday = (e) => {
    e.stopPropagation();
    if (disabled) return;
    const adDateStr = bsToAd(todayBs.year, todayBs.month, todayBs.date);
    if (adDateStr) {
      onChange?.({
        target: {
          name: name || id || 'date',
          value: adDateStr
        }
      });
      setViewYear(todayBs.year);
      setViewMonth(todayBs.month);
      setOpen(false);
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    if (disabled) return;
    onChange?.({
      target: {
        name: name || id || 'date',
        value: ''
      }
    });
    setOpen(false);
  };

  // Calendar math
  const daysInMonth = getDaysInBsMonth(viewYear, viewMonth);
  const firstDayOfWeek = getBsMonthFirstDay(viewYear, viewMonth); // 0 = Sun, 6 = Sat

  // Check if a day cell matches the selected date
  const isDaySelected = (dayNum) => {
    if (!selectedBs) return false;
    return (
      selectedBs.getYear() === viewYear &&
      selectedBs.getMonth() === viewMonth &&
      selectedBs.getDate() === dayNum
    );
  };

  // Check if a day cell is today in BS
  const isDayToday = (dayNum) => {
    return (
      todayBs.year === viewYear &&
      todayBs.month === viewMonth &&
      todayBs.date === dayNum
    );
  };

  const displayBsText = value ? fmtBs(value) : '';
  const adSubtext = value ? (typeof value === 'string' ? value.split('T')[0] : '') : '';

  return (
    <div
      ref={containerRef}
      className={`bs-datepicker-container ${className}`}
      style={{ position: 'relative', width: '100%', ...style }}
      title={title}
    >
      {/* Visual Input Field */}
      <div
        className={`bs-datepicker-input ${disabled ? 'disabled' : ''} ${open ? 'focused' : ''}`}
        onClick={() => !disabled && setOpen(prev => !prev)}
        tabIndex={disabled ? -1 : 0}
        role="button"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0, overflow: 'hidden' }}>
          <Icon name="calendar_month" className="material-symbols-outlined bs-calendar-icon" style={{ fontSize: 18, color: 'var(--color-primary)', flexShrink: 0 }} />
          {displayBsText ? (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, minWidth: 0, overflow: 'hidden' }}>
              <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-on-surface)', whiteSpace: 'nowrap' }}>
                {displayBsText}
              </span>
              {adSubtext && (
                <span style={{ fontSize: 11, color: 'var(--color-on-surface-variant)', whiteSpace: 'nowrap' }}>
                  ({adSubtext})
                </span>
              )}
            </div>
          ) : (
            <span style={{ color: 'var(--color-on-surface-variant)', fontSize: 13 }}>
              {placeholder}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <Icon
            name={open ? 'arrow_drop_up' : 'arrow_drop_down'}
            className="material-symbols-outlined"
            style={{ fontSize: 18, color: 'var(--color-on-surface-variant)' }}
          />
        </div>
      </div>

      {/* Hidden input for native form validity if required */}
      {required && (
        <input
          type="text"
          value={value || ''}
          required={required}
          onChange={() => {}}
          style={{ opacity: 0, height: 0, width: 0, position: 'absolute', pointerEvents: 'none' }}
          tabIndex={-1}
        />
      )}

      {/* Interactive Nepali Calendar Dropdown */}
      {open && (
        <div className="bs-calendar-dropdown" onClick={e => e.stopPropagation()}>
          {/* Header with Navigation & Selectors */}
          <div className="bs-cal-header">
            <button
              type="button"
              className="bs-cal-nav-btn"
              onClick={handlePrevMonth}
              title="Previous Month"
            >
              <Icon name="chevron_left" className="material-symbols-outlined" style={{ fontSize: 18 }} />
            </button>

            <div className="bs-cal-selectors">
              <select
                className="bs-cal-select"
                value={viewMonth}
                onChange={e => setViewMonth(Number(e.target.value))}
              >
                {BS_MONTHS.map((name, idx) => (
                  <option key={name} value={idx}>
                    {name}
                  </option>
                ))}
              </select>

              <select
                className="bs-cal-select"
                value={viewYear}
                onChange={e => setViewYear(Number(e.target.value))}
              >
                {YEARS.map(yr => (
                  <option key={yr} value={yr}>
                    {yr} BS
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              className="bs-cal-nav-btn"
              onClick={handleNextMonth}
              title="Next Month"
            >
              <Icon name="chevron_right" className="material-symbols-outlined" style={{ fontSize: 18 }} />
            </button>
          </div>

          {/* Weekday Labels Header */}
          <div className="bs-cal-weekdays">
            {BS_DAYS_SHORT.map((dayName, idx) => (
              <div
                key={dayName}
                className={`bs-cal-weekday-label ${idx === 6 ? 'bs-cal-saturday' : ''}`}
              >
                {dayName}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="bs-cal-days-grid">
            {/* Blank offset placeholders */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`blank-${i}`} className="bs-cal-day-cell empty" />
            ))}

            {/* Month Day Numbers */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const selected = isDaySelected(dayNum);
              const today = isDayToday(dayNum);
              const dayOfWeek = (firstDayOfWeek + i) % 7;
              const isSaturday = dayOfWeek === 6;

              return (
                <button
                  type="button"
                  key={`day-${dayNum}`}
                  className={`bs-cal-day-btn ${selected ? 'selected' : ''} ${today ? 'today' : ''} ${isSaturday ? 'saturday' : ''}`}
                  onClick={e => handleSelectDay(dayNum, e)}
                  title={`BS: ${BS_MONTHS[viewMonth]} ${dayNum}, ${viewYear}`}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>

          {/* Quick Action Footer */}
          <div className="bs-cal-footer">
            <button
              type="button"
              className="btn btn-xs btn-outline"
              onClick={handleSelectToday}
            >
              Today ({todayBs.date} {BS_MONTHS[todayBs.month]})
            </button>

            {value && (
              <button
                type="button"
                className="btn btn-xs btn-outline"
                onClick={handleClear}
                style={{ color: 'var(--color-error)', borderColor: 'var(--color-outline-variant)' }}
              >
                Clear
              </button>
            )}

            <button
              type="button"
              className="btn btn-xs btn-primary"
              onClick={() => setOpen(false)}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
