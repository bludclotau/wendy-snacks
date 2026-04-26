const fs = require('fs');
const path = require('path');

function loadPlugins(pluginsDir) {
  const files = fs.readdirSync(pluginsDir).filter(f => f.endsWith('.js'));
  return files.map(f => require(path.join(pluginsDir, f)));
}

function processPlugins(plugins, html, url) {
  plugins.forEach(plugin => plugin(html, url));
}

module.exports = { loadPlugins, processPlugins };