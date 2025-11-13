/**
 * Logger utility with log levels
 * Supports: error, warn, info
 * Production defaults to 'info', development defaults to 'info'
 */

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2
};

const getLogLevel = () => {
  const envLevel = process.env.LOG_LEVEL?.toLowerCase() || '';
  const defaultLevel = 'info';
  return LOG_LEVELS[envLevel] !== undefined ? envLevel : defaultLevel;
};

const currentLogLevel = getLogLevel();
const currentLevelValue = LOG_LEVELS[currentLogLevel];

const shouldLog = (level) => {
  return LOG_LEVELS[level] <= currentLevelValue;
};

const formatMessage = (level, message) => {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
};

const logger = {
  error: (message, ...args) => {
    if (shouldLog('error')) {
      console.error(formatMessage('error', message), ...args);
    }
  },

  warn: (message, ...args) => {
    if (shouldLog('warn')) {
      console.warn(formatMessage('warn', message), ...args);
    }
  },

  info: (message, ...args) => {
    if (shouldLog('info')) {
      console.log(formatMessage('info', message), ...args);
    }
  }
};

module.exports = logger;
