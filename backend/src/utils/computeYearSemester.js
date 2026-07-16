/**
 * Dynamically compute current year and semester from enrollment info.
 *
 * Store enrollmentYear = calendar year student enrolled (e.g. 2024)
 * Store enrollmentSemester = 1 or 2
 * Academic year starts in month `startMonth` (default September = 9)
 *
 * Each semester = 6 months. Count months since enrollment, divide by 6.
 */

/**
 * Compute current year and semester.
 * @param {number} enrollmentYear - Calendar year student enrolled (e.g. 2024)
 * @param {number} enrollmentSemester - 1 or 2
 * @param {number} [startMonth=9] - Month academic year starts (1-12)
 * @param {number} [maxYear=4] - Max years in program
 * @param {Date} [now] - Reference date
 * @returns {{ year: number, semester: number, totalSemester: number } | null}
 */
function computeCurrentYearSemester(enrollmentYear, enrollmentSemester, startMonth = 9, maxYear = 4, now = new Date()) {
  if (!enrollmentYear || !enrollmentSemester) return null;

  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // When did this enrollment semester start?
  const enrollStartMonth = startMonth + (enrollmentSemester - 1) * 6;

  // Months elapsed since enrollment semester started
  const monthsElapsed = (currentYear - enrollmentYear) * 12 + (currentMonth - enrollStartMonth);

  // How many full semesters have passed since enrollment
  const semestersPassed = Math.floor(monthsElapsed / 6);

  // Current position in program
  const totalSemester = enrollmentSemester + semestersPassed;
  const year = Math.ceil(totalSemester / 2);
  const semester = totalSemester - (year - 1) * 2;

  // Clamp
  return {
    year: Math.min(Math.max(1, year), maxYear),
    semester: Math.min(Math.max(1, semester), 2),
    totalSemester,
  };
}

module.exports = { computeCurrentYearSemester };
