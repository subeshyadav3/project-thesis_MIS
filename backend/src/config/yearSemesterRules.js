/**
 * Year/Semester rules for Bachelor and Master programs.
 *
 * Bachelor: 4 years, 8 semesters
 *   - Minor Project: Year 3 (sem 5 or 6) — flexible
 *   - Major Project: Year 4 (sem 7 or 8) — flexible
 *
 * Master: 2 years, 4 semesters
 *   - Project: Semester 3
 *   - Thesis: Semester 4
 */

const RULES = {
  BACHELOR: {
    totalYears: 4,
    totalSemesters: 8,
    semestersPerYear: 2,
    projectRules: {
      MINOR: {
        label: 'Minor Project',
        allowedYears: [3],
        allowedSemesters: [5, 6], // flexible — both semesters of year 3
        credit: 3,
      },
      MAJOR: {
        label: 'Major Project',
        allowedYears: [4],
        allowedSemesters: [7, 8], // flexible — both semesters of year 4
        credit: 6,
      },
    },
  },
  MASTER: {
    totalYears: 2,
    totalSemesters: 4,
    semestersPerYear: 2,
    projectRules: {
      PROJECT: {
        label: 'Master Project',
        allowedYears: [2],
        allowedSemesters: [3],
        credit: 8,
      },
      THESIS: {
        label: 'Master Thesis',
        allowedYears: [2],
        allowedSemesters: [4],
        credit: 16,
      },
    },
  },
};

/**
 * Validate if a student's year/semester is eligible for a project type.
 * @param {string} degreeType - 'BACHELOR' or 'MASTER'
 * @param {string} projectType - 'MINOR', 'MAJOR', 'PROJECT', 'THESIS'
 * @param {number} year - Student's current year (1-4 for bachelor, 1-2 for master)
 * @param {number} semester - Student's current semester (1-8 for bachelor, 1-4 for master)
 * @returns {{ valid: boolean, error?: string, rule?: object }}
 */
function validateYearSemester(degreeType, projectType, year, semester) {
  const degreeRules = RULES[degreeType];
  if (!degreeRules) return { valid: false, error: `Unknown degree type: ${degreeType}` };

  // Normalize project type
  let normalizedType = projectType;
  if (degreeType === 'MASTER') {
    if (projectType === 'MINOR' || projectType === 'MAJOR') {
      normalizedType = 'PROJECT';
    }
  }

  const rule = degreeRules.projectRules[normalizedType];
  if (!rule) return { valid: false, error: `Unknown project type: ${projectType} for ${degreeType}` };

  if (!year || !semester) {
    return {
      valid: true,
      warning: `Year and semester not specified. Allowed: ${rule.label} in ${rule.allowedYears.map(y => `Year ${y}`).join(' or ')}, semesters ${rule.allowedSemesters.join(' or ')}`,
      rule,
    };
  }

  if (!rule.allowedYears.includes(year)) {
    return {
      valid: false,
      error: `${rule.label} is only allowed in ${rule.allowedYears.map(y => `Year ${y}`).join(' or ')}. Student is in Year ${year}.`,
      rule,
    };
  }

  if (!rule.allowedSemesters.includes(semester)) {
    return {
      valid: false,
      error: `${rule.label} is only allowed in semesters ${rule.allowedSemesters.join(' or ')}. Student is in semester ${semester}.`,
      rule,
    };
  }

  return { valid: true, rule };
}

/**
 * Get year/semester info from a program and academic year.
 * Useful for auto-determining which project types are eligible.
 */
function getEligibleProjectTypes(degreeType, year, semester) {
  const degreeRules = RULES[degreeType];
  if (!degreeRules) return [];

  const eligible = [];
  for (const [type, rule] of Object.entries(degreeRules.projectRules)) {
    if (year && semester) {
      if (rule.allowedYears.includes(year) && rule.allowedSemesters.includes(semester)) {
        eligible.push({ type, ...rule });
      }
    } else {
      eligible.push({ type, ...rule });
    }
  }
  return eligible;
}

/**
 * Get human-readable semester info.
 */
function getSemesterInfo(degreeType, semester) {
  const rules = RULES[degreeType];
  if (!rules) return null;
  const year = Math.ceil(semester / rules.semestersPerYear);
  const semInYear = semester - (year - 1) * rules.semestersPerYear;
  return { year, semesterInYear: semInYear, totalSemester: semester };
}

module.exports = {
  RULES,
  validateYearSemester,
  getEligibleProjectTypes,
  getSemesterInfo,
};
