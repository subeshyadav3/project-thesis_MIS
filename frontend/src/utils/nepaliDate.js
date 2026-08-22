import NepDateModule, { dateConfigMap as rawConfigMap } from 'nepali-date-converter';

const NepaliDate = NepDateModule?.default || NepDateModule;
const dateConfigMap = rawConfigMap || NepDateModule?.dateConfigMap || {};

export const BS_MONTHS = [
  'Baishakh', 'Jestha', 'Asar', 'Shrawan',
  'Bhadra', 'Aswin', 'Kartik', 'Mangsir',
  'Poush', 'Magh', 'Falgun', 'Chaitra'
];

export const BS_MONTHS_NP = [
  'बैशाख', 'जेठ', 'असार', 'श्रावण',
  'भाद्र', 'असोज', 'कार्तिक', 'मंसिर',
  'पुष', 'माघ', 'फाल्गुन', 'चैत'
];

export const BS_DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const BS_DAYS_NP = ['आइत', 'सोम', 'मङ्गल', 'बुध', 'बिही', 'शुक्र', 'शनि'];

/** Safely parse any date representation (AD string, ISO string, Date, timestamp) */
export function parseAdDate(dateInput) {
  if (!dateInput) return null;
  if (dateInput instanceof Date) {
    return Number.isNaN(dateInput.getTime()) ? null : dateInput;
  }
  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    if (!trimmed) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [y, m, d] = trimmed.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    const d = new Date(trimmed);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof dateInput === 'number') {
    const d = new Date(dateInput);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/** Convert an AD date to NepaliDate (BS); returns null when unsupported/invalid. */
export function toBs(dateInput) {
  const d = parseAdDate(dateInput);
  if (!d) return null;
  try {
    return new NepaliDate(d);
  } catch {
    return null;
  }
}

/** Get number of days in a specific BS year and BS month (0-11) */
export function getDaysInBsMonth(bsYear, bsMonthIndex) {
  try {
    const yearCfg = dateConfigMap[String(bsYear)];
    if (yearCfg) {
      const vals = Object.values(yearCfg);
      if (vals[bsMonthIndex] !== undefined) return vals[bsMonthIndex];
    }
    for (let testDay = 32; testDay >= 29; testDay--) {
      try {
        const nd = new NepaliDate(bsYear, bsMonthIndex, testDay);
        if (nd.getMonth() === bsMonthIndex) return testDay;
      } catch {}
    }
    return 30;
  } catch {
    return 30;
  }
}

/** Get day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday) for day 1 of a BS month */
export function getBsMonthFirstDay(bsYear, bsMonthIndex) {
  try {
    const nd = new NepaliDate(bsYear, bsMonthIndex, 1);
    return nd.getDay();
  } catch {
    return 0;
  }
}

/** Convert BS year, month (0-11), and day (1-32) to AD ISO date string 'YYYY-MM-DD' */
export function bsToAd(bsYear, bsMonthIndex, bsDay) {
  try {
    const nd = new NepaliDate(bsYear, bsMonthIndex, bsDay);
    const js = nd.toJsDate();
    const y = js.getFullYear();
    const m = String(js.getMonth() + 1).padStart(2, '0');
    const d = String(js.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  } catch {
    return null;
  }
}

/** Get today's BS date object: { year, month, date, day } */
export function getTodayBs() {
  try {
    const nowBs = new NepaliDate();
    return {
      year: nowBs.getYear(),
      month: nowBs.getMonth(),
      date: nowBs.getDate(),
      day: nowBs.getDay()
    };
  } catch {
    return { year: 2083, month: 4, date: 6, day: 6 };
  }
}

/** Format as "Bhadra 6, 2083" — Bikram Sambat in English script. */
export function fmtBs(dateInput) {
  const bs = toBs(dateInput);
  if (!bs) return null;
  const monthName = BS_MONTHS[bs.getMonth()] || '';
  return `${monthName} ${bs.getDate()}, ${bs.getYear()}`;
}

/** Format as "Bhadra 6, 2083 (2026-08-22)" */
export function fmtBsWithAd(dateInput) {
  const bsStr = fmtBs(dateInput);
  if (!bsStr) return null;
  const d = parseAdDate(dateInput);
  if (!d) return bsStr;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dt = String(d.getDate()).padStart(2, '0');
  return `${bsStr} (${y}-${m}-${dt})`;
}

export default {
  toBs,
  fmtBs,
  fmtBsWithAd,
  bsToAd,
  getDaysInBsMonth,
  getBsMonthFirstDay,
  getTodayBs,
  BS_MONTHS,
  BS_MONTHS_NP,
  BS_DAYS_SHORT,
  BS_DAYS_NP
};
