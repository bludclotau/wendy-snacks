const fs = require('fs');
const path = require('path');

function detectDrift(dom, plugin) {
  if (!dom || !plugin) return { drift: false, details: [] };

  const details = [];
  const expectedSelectors = [];

  if (plugin.schema && plugin.schema.fields) {
    for (const field of plugin.schema.fields) {
      let found = false;
      for (const el of dom) {
        if (el.id === field.name || el.c?.includes(field.name)) {
          found = true;
          break;
        }
      }
      if (!found) {
        details.push({ type: 'missing_field', field: field.name });
      }
    }
  }

  return { drift: details.length > 0, details };
}

function generateMutations(plugin, driftInfo) {
  const mutations = [];

  if (!plugin) return mutations;

  const baseCode = plugin.code || '';

  for (const detail of driftInfo) {
    if (detail.type === 'missing_field') {
      const mutationCode = baseCode.replace(
        detail.field,
        `${detail.field}_new`
      );
      mutations.push({
        original: plugin.name,
        type: 'add_field',
        code: mutationCode,
        reason: `Added missing field: ${detail.field}`
      });
    }
  }

  mutations.push({
    original: plugin.name,
    type: 'retry_selector',
    code: baseCode.replace(/selector/g, 'selector2'),
    reason: 'Retry with alternate selector'
  });

  return mutations;
}

async function sandboxValidate(mutatedPlugin) {
  try {
    const fn = new Function('return ' + mutatedPlugin.code)();
    if (typeof fn.run !== 'function') {
      return { valid: false, error: 'no run function' };
    }

    return { valid: true, rowsExtracted: 0 };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}

function scoreMutation(validationResult) {
  let score = 0;

  if (validationResult.valid) score += 0.5;
  if (validationResult.rowsExtracted > 0) score += 0.3;
  if (!validationResult.error) score += 0.2;

  return parseFloat(score.toFixed(2));
}

function promoteMutation(domain, mutatedPlugin) {
  const autoDir = path.join(__dirname, '..', '..', 'plugins', 'auto', domain);
  if (!fs.existsSync(autoDir)) {
    fs.mkdirSync(autoDir, { recursive: true });
  }

  const timestamp = Date.now();
  const filePath = path.join(autoDir, `v${timestamp}.js`);

  fs.writeFileSync(filePath, mutatedPlugin.code, 'utf8');

  return { promotedPath: filePath, timestamp };
}

module.exports = {
  detectDrift,
  generateMutations,
  sandboxValidate,
  scoreMutation,
  promoteMutation
};