/**
 * Fuzzy name matching for Excel bulk import.
 * Matches an input name against an array of candidate objects (with firstName, lastName).
 * Returns { user, score, method } or null if below threshold.
 *
 * @param {string} inputName      - The name string from Excel to match (e.g. "Dr. Ram Acharya")
 * @param {Array} candidates      - Array of objects with { firstName, lastName }
 * @param {number} [threshold=0.4] - Minimum score (0-1) to consider a match
 * @returns {{ user: Object, score: number, method: string } | null}
 */
function fuzzyMatch(inputName, candidates, threshold = 0.4) {
  if (!inputName || !inputName.trim()) return null;
  const normalized = name => name.toLowerCase().trim().replace(/\s+/g, ' ');
  const input = normalized(inputName);
  let bestMatch = null;
  let bestScore = 0;

  for (const c of candidates) {
    const fullName = normalized(`${c.firstName} ${c.lastName}`);
    // Exact substring match = 1.0
    if (fullName.includes(input) || input.includes(fullName)) {
      return { user: c, score: 1.0, method: 'exact' };
    }
    // Word-level matching
    const inputWords = input.split(' ');
    const nameWords = fullName.split(' ');
    const matched = inputWords.filter(w => nameWords.some(nw => nw.includes(w) || w.includes(nw)));
    const score = matched.length / Math.max(inputWords.length, nameWords.length);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = c;
    }
  }

  return bestScore >= threshold ? { user: bestMatch, score: bestScore, method: 'fuzzy' } : null;
}

module.exports = fuzzyMatch;
