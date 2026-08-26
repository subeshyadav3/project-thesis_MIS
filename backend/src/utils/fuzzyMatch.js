/**
 * Computes Levenshtein edit distance between two strings.
 * @param {string} a 
 * @param {string} b 
 * @returns {number}
 */
function levenshtein(a, b) {
  const an = a.length, bn = b.length;
  if (an === 0) return bn;
  if (bn === 0) return an;
  const matrix = Array.from({ length: bn + 1 }, (_, i) => [i]);
  for (let j = 0; j <= an; j++) matrix[0][j] = j;
  for (let i = 1; i <= bn; i++) {
    for (let j = 1; j <= an; j++) {
      if (b[i - 1] === a[j - 1]) matrix[i][j] = matrix[i - 1][j - 1];
      else matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + 1);
    }
  }
  return matrix[bn][an];
}

/**
 * Computes normalized Levenshtein similarity (0.0 to 1.0).
 * @param {string} a 
 * @param {string} b 
 * @returns {number}
 */
function levenshteinSimilarity(a, b) {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1.0;
  return 1 - levenshtein(a, b) / maxLen;
}

/**
 * Fuzzy name matching for Excel bulk import and Coordinator Response Matrix.
 * Handles exact substrings, honorary prefixes, missing letters, and typos (e.g. "suesh yadv" -> "Subesh Yadav").
 *
 * @param {string} inputName      - The name string from Excel or form (e.g. "Dr. Ram Acharya", "suesh yadv")
 * @param {Array} candidates      - Array of objects with { firstName, lastName }
 * @param {number} [threshold=0.4] - Minimum score (0-1) to consider a match
 * @returns {{ user: Object, score: number, method: string } | null}
 */
function fuzzyMatch(inputName, candidates, threshold = 0.4) {
  if (!inputName || !inputName.trim() || !Array.isArray(candidates) || candidates.length === 0) return null;
  const normalized = name => name.toLowerCase().trim().replace(/^(dr\.|er\.|prof\.|assoc\.\s*prof\.|asst\.\s*prof\.|mr\.|ms\.|mrs\.)\s*/i, '').replace(/\s+/g, ' ');
  const rawInputNorm = inputName.toLowerCase().trim().replace(/\s+/g, ' ');
  const input = normalized(inputName);
  let bestMatch = null;
  let bestScore = 0;

  for (const c of candidates) {
    const rawFullName = `${c.firstName || ''} ${c.lastName || ''}`.toLowerCase().trim().replace(/\s+/g, ' ');
    const fullName = normalized(rawFullName);

    // 1. Exact substring match on raw or normalized name = 1.0
    if (rawFullName.includes(rawInputNorm) || rawInputNorm.includes(rawFullName) ||
        fullName.includes(input) || input.includes(fullName)) {
      return { user: c, score: 1.0, method: 'exact' };
    }

    // 2. Full-string Levenshtein similarity
    const fullSim = Math.max(
      levenshteinSimilarity(rawInputNorm, rawFullName),
      levenshteinSimilarity(input, fullName)
    );

    // 3. Word-level token matching with Levenshtein typo tolerance
    const inputWords = input.split(' ').filter(Boolean);
    const nameWords = fullName.split(' ').filter(Boolean);

    let tokenScoreSum = 0;
    for (const iw of inputWords) {
      let maxWordSim = 0;
      for (const nw of nameWords) {
        if (iw === nw) {
          maxWordSim = 1.0;
        } else if (nw.includes(iw) || iw.includes(nw)) {
          maxWordSim = Math.max(maxWordSim, 0.85);
        } else {
          const sim = levenshteinSimilarity(iw, nw);
          if (sim >= 0.55) {
            maxWordSim = Math.max(maxWordSim, sim);
          }
        }
      }
      tokenScoreSum += maxWordSim;
    }

    const tokenScore = inputWords.length > 0 ? tokenScoreSum / Math.max(inputWords.length, nameWords.length) : 0;
    const candidateScore = Math.max(fullSim, tokenScore);

    if (candidateScore > bestScore) {
      bestScore = candidateScore;
      bestMatch = c;
    }
  }

  return bestScore >= threshold ? { user: bestMatch, score: parseFloat(bestScore.toFixed(3)), method: 'fuzzy' } : null;
}

module.exports = fuzzyMatch;
