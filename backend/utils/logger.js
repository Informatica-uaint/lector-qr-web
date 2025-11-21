const levels = { error: 0, warn: 1, info: 2, log: 2, debug: 3 };
const envLevel = (process.env.LOG_LEVEL || (process.env.NODE_ENV === 'development' ? 'debug' : 'info')).toLowerCase();
const currentLevel = levels[envLevel] ?? levels.info;

const allow = (level) => levels[level] <= currentLevel;

const logger = {
  log: (...args) => {
    if (allow('log')) console.log(...args);
  },
  info: (...args) => {
    if (allow('info')) console.info(...args);
  },
  warn: (...args) => {
    if (allow('warn')) console.warn(...args);
  },
  error: (...args) => {
    console.error(...args);
  },
  debug: (...args) => {
    if (allow('debug')) console.debug(...args);
  }
};

module.exports = logger;
