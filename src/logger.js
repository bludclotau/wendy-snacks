const logger = {
  info: (message, data = {}) =>
    console.log(JSON.stringify({ level: 'info', timestamp: new Date().toISOString(), message, ...data })),
  warn: (message, data = {}) =>
    console.log(JSON.stringify({ level: 'warn', timestamp: new Date().toISOString(), message, ...data })),
  error: (message, data = {}) =>
    console.log(JSON.stringify({ level: 'error', timestamp: new Date().toISOString(), message, ...data })),
  debug: (enabled, message, data = {}) => {
    if (enabled) {
      console.log(JSON.stringify({ level: 'debug', timestamp: new Date().toISOString(), message, ...data }));
    }
  }
};

module.exports = logger;