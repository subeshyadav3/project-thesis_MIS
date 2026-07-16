const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

/**
 * Convert integer to Roman numeral.
 * @param {number} num
 * @returns {string} e.g. 3 → "III"
 */
export function toRoman(num) {
  if (!num || num < 1 || num > 10) return String(num || '');
  return ROMAN[num];
}

/**
 * Format year/semester as "III/II" style.
 * @param {number} year
 * @param {number} semester
 * @returns {string} e.g. "III/II"
 */
export function formatYearSemester(year, semester) {
  if (!year && !semester) return '—';
  if (year && semester) return `${toRoman(year)}/${toRoman(semester)}`;
  if (year) return toRoman(year);
  return toRoman(semester);
}
