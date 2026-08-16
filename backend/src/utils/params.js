
/**
 * Shared request-parameter helpers.
 * All `parseInt(req.params.id)` sites should route through parseId so an
 * invalid id returns a clean 400 instead of a Prisma NaN 500.
 */

/** Parse a positive integer from a value; returns null when absent/invalid. */
function toId(value) {
  if (value === undefined || value === null || value === '') return null;
  const num = Number(value);
  return Number.isInteger(num) && num > 0 ? num : null;
}

/** Parse a required route/query id, responding 400 when invalid. */
function parseId(req, res, param = 'id') {
  const id = toId(req.params[param] ?? req.query[param]);
  if (id === null) {
    res.status(400).json({ error: `Invalid ${param}` });
    return null;
  }
  return id;
}

module.exports = { toId, parseId };
