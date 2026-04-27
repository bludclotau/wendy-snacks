const logger = require('./logger.js');

async function runPluginAction(plugin, { page, action, debug = false }) {
  const { handler, name } = plugin;

  if (!handler || typeof handler.run !== 'function') {
    logger.warn('plugin_missing_run', { name });
    throw new Error(`Plugin ${name} has no run() function`);
  }

  const safeContext = {
    page,
    action,
    log: (level, message, data = {}) => {
      logger.info('plugin_log', { plugin: name, level, message, ...data });
    }
  };

  try {
    logger.info('plugin_action_start', { plugin: name, action: action.action });
    const result = await handler.run(safeContext);
    logger.info('plugin_action_complete', { plugin: name, action: action.action });
    return result;
  } catch (err) {
    logger.error('plugin_action_error', { plugin: name, error: err.message });
    throw err;
  }
}

module.exports = {
  runPluginAction
};