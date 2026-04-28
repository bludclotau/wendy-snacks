const path = require('path');
const fs = require('fs');
const logger = require('./logger.js');
const { runInSandbox } = require('./pluginSandbox');

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

  if (config.enabled) {
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
  }

  const autoDir = path.join(__dirname, '..', 'plugins', 'auto');
  if (fs.existsSync(autoDir)) {
    const autoFiles = fs.readdirSync(autoDir).filter(f => f.endsWith('.js'));
    for (const f of autoFiles) {
      try {
        const mod = require(path.join(autoDir, f));
        const domain = f.replace('.js', '');
        registry.set(domain, {
          name: domain,
          module: `../plugins/auto/${f}`,
          description: 'Auto-generated extractor',
          actions: ['autoExtract'],
          handler: mod
        });
        logger.info('auto_plugin_loaded', { domain });
      } catch (err) {
        logger.error('auto_plugin_load_failed', { file: f, error: err.message });
      }
    }
  }

  const siteMemoryBase = path.join(__dirname, '..', 'memory', 'sites');
  if (fs.existsSync(siteMemoryBase)) {
    const siteDirs = fs.readdirSync(siteMemoryBase).filter(f => !f.startsWith('.'));
    for (const siteDomain of siteDirs) {
      const extractorFile = path.join(siteMemoryBase, siteDomain, 'extractor.js');
      if (fs.existsSync(extractorFile)) {
        try {
          const mod = require(extractorFile);
          registry.set(`site:${siteDomain}`, {
            name: siteDomain,
            module: `../memory/sites/${siteDomain}/extractor.js`,
            description: 'Site-specific extractor from memory',
            actions: ['autoExtract'],
            handler: mod
          });
          logger.info('site_extractor_loaded', { domain: siteDomain });
        } catch (err) {
          logger.error('site_extractor_load_failed', { domain: siteDomain, error: err.message });
        }
      }
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

function hasPluginForDomain(registry, domain) {
  return registry.has(domain) || registry.has(`site:${domain}`);
}

module.exports = {
  buildRegistry,
  findPluginsForAction,
  hasPluginForDomain
};