
/**
 * Minimal structured logger with timestamps and level labels.
 * Drop-in replacement for console.* — same call signatures.
 */
function ts() {
  return new Date().toISOString();
}

function make(level, label) {
  return (...args) => {
    const [first, ...rest] = args;
    if (typeof first === 'string') {
      console[level](`[${ts()}] ${label} ${first}`, ...rest);
    } else {
      console[level](`[${ts()}] ${label}`, first, ...rest);
    }
  };
}

module.exports = {
  log: make('log', 'INFO '),
  info: make('log', 'INFO '),
  warn: make('warn', 'WARN '),
  error: make('error', 'ERROR'),
  debug: make('debug', 'DEBUG'),
};
