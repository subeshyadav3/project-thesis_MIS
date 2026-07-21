/**
 * Compute current year and semester from batch and degree type.
 *
 * Intake periods (Nepali calendar):
 *   Bachelor (BE/B.Arch) – Mangsir (≈ November)  OR  Ashadh / Shrawan (≈ June–August)
 *   Master   (M.Sc)      – Magh / Falgun (≈ January–February)  OR  Chaitra / Baishakh (≈ March–April)
 *
 * Each semester = 6 months.
 *
 * The batch field stores the Nepali (BS) year, e.g. "2078", "2080".
 * We convert it to an approximate Gregorian year, then compute how many
 * 6‑month semesters have elapsed since the intake month.
 */

/**
 * Convert a Nepali BS year to the Gregorian year of its Mangsir (≈ November).
 * Mangsir is month 8 of the BS year, which falls in the same Gregorian year
 * as Baishakh–Ashwin (months 1–7).
 *
 * BS → Gregorian:  Greg ≈ BS − 57
 * Example:  2080 BS → 2023  (Mangsir 2080 ≈ Nov 2023)
 */
function bsYearToGregorianMangsir(bsYear) {
  return bsYear - 57;
}

/**
 * Convert a Nepali BS year to the Gregorian year of its Magh (≈ January–February).
 * Magh is month 10, which falls in the *next* Gregorian year relative to
 * Baishakh–Ashwin.
 *
 * BS → Gregorian for Magh:  Greg ≈ BS − 56
 * Example:  2080 BS → 2024  (Magh 2080 ≈ Feb 2024)
 */
function bsYearToGregorianMagh(bsYear) {
  return bsYear - 56;
}

/**
 * Compute current year and semester from a batch (Nepali BS year).
 *
 * @param {string} batch - e.g. "2078", "2080", or short form "080"
 * @param {'BACHELOR'|'MASTER'} degreeType
 * @param {Date} [now] - Reference date (defaults to now)
 * @returns {{ currentYear: number|null, currentSemester: number|null }}
 */
function computeCurrentYearSemesterFromBatch(batch, degreeType, now = new Date()) {
  if (!batch) return { currentYear: null, currentSemester: null };

  // Parse batch — it may be stored as "2078" (full) or "080" (short).
  let bsYear = parseInt(batch, 10);
  if (bsYear < 100) bsYear += 2000; // "080" → 2080

  const currentMonth = now.getMonth() + 1; // 1–12
  const currentYear = now.getFullYear();

  // Determine the intake start month and the BS→Gregorian conversion function.
  let startMonth;      // Gregorian month (1–12) when this batch's sem 1 begins
  let startGregYear;   // Gregorian year of that start month
  let maxSemesters;

  if (degreeType === 'BACHELOR') {
    // Primary intake: Mangsir (≈ November). If the batch's Mangsir start is
    // still in the future (monthsElapsed < 0), fall back to the earlier
    // Ashadh/Shrawan (≈ June) intake of the same BS year.
    startMonth = 11;                               // Mangsir ≈ November
    startGregYear = bsYearToGregorianMangsir(bsYear);
    maxSemesters = 8;                              // 4 years × 2
  } else {
    // Master primary intake: Magh (≈ February). Fallback to Chaitra (≈ March).
    startMonth = 2;                                // Magh ≈ February
    startGregYear = bsYearToGregorianMagh(bsYear);
    maxSemesters = 4;                              // 2 years × 2
  }

  let monthsElapsed = computeMonthsElapsed(startGregYear, startMonth, currentYear, currentMonth);

  // If the batch hasn't started yet under the primary intake, try the
  // earlier alternate intake of the same BS year.
  if (monthsElapsed < 0) {
    if (degreeType === 'BACHELOR') {
      // Ashadh / Shrawan (≈ June) — this is in the same Gregorian year as
      // Mangsir for the same BS year, so Greg year is the same.
      startMonth = 6;
      // startGregYear unchanged — Mangsir and Ashadh are both in the same
      // Gregorian year for a given BS year (e.g. 2080 BS → 2023).
    } else {
      // Chaitra / Baishakh (≈ March) — this is in the same Gregorian year
      // as Magh for the same BS year.
      startMonth = 3;
      // startGregYear unchanged
    }
    monthsElapsed = computeMonthsElapsed(startGregYear, startMonth, currentYear, currentMonth);
  }

  // Still in the future? Default to Year I / Semester I.
  if (monthsElapsed < 0) {
    return { currentYear: 1, currentSemester: 1 };
  }

  // Semesters elapsed (0‑based) → current semester (1‑based)
  const currentSem = Math.min(Math.floor(monthsElapsed / 6) + 1, maxSemesters);

  const year = Math.ceil(currentSem / 2);
  const semesterInYear = currentSem - (year - 1) * 2;

  const maxYear = degreeType === 'MASTER' ? 2 : 4;

  return {
    currentYear: Math.min(year, maxYear),
    currentSemester: Math.min(Math.max(1, semesterInYear), 2),
  };
}

/**
 * Compute months elapsed from a start date (Gregorian) to the current date.
 */
function computeMonthsElapsed(startYear, startMonth, currentYear, currentMonth) {
  return (currentYear - startYear) * 12 + (currentMonth - startMonth);
}

/**
 * Original generic version — kept for backward compatibility.
 * Computes from explicit enrollment year / semester.
 *
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

  const enrollStartMonth = startMonth + (enrollmentSemester - 1) * 6;
  const monthsElapsed = (currentYear - enrollmentYear) * 12 + (currentMonth - enrollStartMonth);
  const semestersPassed = Math.floor(monthsElapsed / 6);

  const totalSemester = enrollmentSemester + semestersPassed;
  const year = Math.ceil(totalSemester / 2);
  const semester = totalSemester - (year - 1) * 2;

  return {
    year: Math.min(Math.max(1, year), maxYear),
    semester: Math.min(Math.max(1, semester), 2),
    totalSemester,
  };
}

module.exports = { computeCurrentYearSemester, computeCurrentYearSemesterFromBatch };
