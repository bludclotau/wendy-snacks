const fs = require('fs');
const path = require('path');

function log(level, message, data = {}) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...data
  }));
}

function loadPlugins(pluginsDir) {
  log('info', 'plugin_load_start', { pluginsDir });
  const files = fs.readdirSync(pluginsDir).filter(f => f.endsWith('.js'));
  const plugins = files.map(f => {
    const plugin = require(path.join(pluginsDir, f));
    const name = path.basename(f, '.js');
    log('info', 'plugin_loaded', { name });
    if (name === 'reason') {
      log('info', 'plugin_reason_registered');
    }
    return {
      name,
      fn: plugin.run || plugin
    };
  });
  return plugins;
}

async function runAllPlugins(pluginsDir, html, url, browserContext = null) {
  const plugins = loadPlugins(pluginsDir);
  const results = {};

  for (const plugin of plugins) {
    log('info', 'plugin_run_start', { name: plugin.name });
    try {
      const fnLength = plugin.fn.length;
      if (fnLength >= 3 && browserContext) {
        log('info', 'plugin_browser_context_passed', { name: plugin.name });
        results[plugin.name] = await plugin.fn(html, url, browserContext);
      } else {
        results[plugin.name] = await plugin.fn(html, url);
      }
      log('info', 'plugin_run_complete', { name: plugin.name });
    } catch (err) {
      results[plugin.name] = { error: err.message };
      log('error', 'plugin_run_complete', { name: plugin.name, error: err.message });
    }
  }

  log('info', 'plugin_all_complete', { count: plugins.length });
  return results;
}

module.exports = { loadPlugins, runAllPlugins };