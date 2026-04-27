const path = require('path');
const fs = require('fs');
const logger = require('./logger.js');

function loadPluginConfig() {
  const configPath = path.join(__dirname, '..', 'config', 'plugins.json');
  if (!fs.existsSync(configPath)) {
    logger.warn('plugin_config_missing', { configPath });
    return { enabled: false, plugins: [] };
  }

  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed;
  } catch (err) {
    logger.error('plugin_config_parse_error', { error: err.message });
    return { enabled: false, plugins: [] };
  }
}

function buildRegistry() {
  const config = loadPluginConfig();
  const registry = new Map();

  if (!config.enabled) {
    return registry;
  }

  for (const plugin of config.plugins || []) {
    try {
      const mod = require(plugin.module);
      registry.set(plugin.name, {
        ...plugin,
        handler: mod
      });
      logger.info('plugin_loaded', { name: plugin.name, module: plugin.module });
    } catch (err) {
      logger.error('plugin_load_failed', { name: plugin.name, module: plugin.module, error: err.message });
    }
  }

  return registry;
}

function findPluginsForAction(registry, actionName) {
  const matches = [];
  for (const [name, plugin] of registry.entries()) {
    if (plugin.actions && plugin.actions.includes(actionName)) {
      matches.push(plugin);
    }
  }
  return matches;
}

module.exports = {
  buildRegistry,
  findPluginsForAction
};