const fs = require('fs');
const path = require('path');

const AUTO_DIR = path.join(__dirname, '..', 'plugins', 'auto');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function generatePlugin({ domain, schema, selectors = {} }) {
  ensureDir(AUTO_DIR);

  const safeDomain = domain.replace(/[^a-z0-9]/gi, '_');
  const pluginPath = path.join(AUTO_DIR, `${safeDomain}.js`);

  const fieldAssignments = (schema.fields || [])
    .map(f => {
      const sel = selectors[f.name] || '.';
      return `            ${f.name}: el.querySelector(${JSON.stringify(sel)})?.innerText.trim() || null`;
    })
    .join(',\n');

  const code = `async function run({ page, action, log }) {
  const selector = action.selector || 'body';
  const rows = await page.$$eval(selector, els => {
    return els.map(el => {
${fieldAssignments || '            _raw: el.innerText.trim()'}
    });
  });

  log('info', 'auto_extract_success', { count: rows.length, domain: ${JSON.stringify(domain)} });
  return { type: 'auto_extract_result', rows };
}

module.exports = { run };
`;

  fs.writeFileSync(pluginPath, code, 'utf8');

  return {
    pluginPath,
    domain,
    schema
  };
}

module.exports = {
  generatePlugin
};