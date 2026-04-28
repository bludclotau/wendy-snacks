function detectRepeatedBlocks(domSummary) {
  if (!domSummary || !Array.isArray(domSummary) || domSummary.length < 2) {
    return [];
  }

  const blocks = [];
  const tagGroups = {};

  for (const el of domSummary) {
    const tag = el.t;
    if (!tagGroups[tag]) {
      tagGroups[tag] = [];
    }
    tagGroups[tag].push(el);
  }

  for (const tag of Object.keys(tagGroups)) {
    const group = tagGroups[tag];
    if (group.length >= 2) {
      blocks.push({ tag, elements: group });
    }
  }

  return blocks;
}

function inferFieldNames(block) {
  const fields = new Map();
  const elements = block.elements || [];

  for (const el of elements) {
    if (el.x) {
      const words = el.x.split(/\s+/).filter(w => w.length > 1);
      for (const word of words.slice(0, 3)) {
        const lc = word.toLowerCase();
        if (!fields.has(lc)) {
          fields.set(lc, 0);
        }
        fields.set(lc, fields.get(lc) + 1);
      }
    }

    if (el.c) {
      const classes = el.c.split(' ').filter(c => c.length > 2);
      for (const cls of classes) {
        const lc = cls.toLowerCase();
        if (!fields.has(lc)) {
          fields.set(lc, 0);
        }
        fields.set(lc, fields.get(lc) + 1);
      }
    }
  }

  const results = [];
  for (const [name, count] of fields) {
    results.push({ name, count });
  }

  results.sort((a, b) => b.count - a.count);
  return results.slice(0, 5).map(r => r.name);
}

function inferFieldTypes(values) {
  const types = {
    number: 0,
    percent: 0,
    currency: 0,
    string: 0,
    date: 0
  };

  for (const val of values) {
    const s = String(val).trim();
    if (!s) continue;

    if (/^-?\d+\.?\d*$/.test(s)) {
      types.number++;
    } else if (/^\d+(\.\d+)?%$/.test(s)) {
      types.percent++;
    } else if (/^[$£€¥]\d+/.test(s) || /^\d+(\.\d+)?\s*[$£€¥]/.test(s)) {
      types.currency++;
    } else if (/^\d{1,2}\/\d{1,2}(\/\d{2,4})?$/.test(s) || /^\w{3,9}\s+\d{1,2}/.test(s)) {
      types.date++;
    } else {
      types.string++;
    }
  }

  let maxType = 'string';
  let maxCount = types.string;
  for (const [t, c] of Object.entries(types)) {
    if (c > maxCount) {
      maxType = t;
      maxCount = c;
    }
  }

  return maxType;
}

function inferSchemaFromDom(domSummary, domain = 'auto_inferred') {
  const blocks = detectRepeatedBlocks(domSummary);

  if (blocks.length === 0) {
    return {
      name: `auto_inferred_${domain}`,
      fields: []
    };
  }

  const mainBlock = blocks[0];
  const candidateNames = inferFieldNames(mainBlock);

  const sampleElements = mainBlock.elements.slice(0, 5);
  const sampleValues = [];

  for (const el of sampleElements) {
    if (el.x) {
      sampleValues.push(el.x);
    }
  }

  const inferredType = inferFieldTypes(sampleValues);

  const fields = candidateNames.map(name => ({
    name,
    type: inferredType
  }));

  return {
    name: `auto_inferred_${domain}`,
    fields
  };
}

function inferSchemaFromHtml(html, domain = 'unknown') {
  let domSummary;

  try {
    const parsed = JSON.parse(html);
    if (Array.isArray(parsed)) {
      domSummary = parsed;
    } else {
      domSummary = parsed.items || [];
    }
  } catch {
    return {
      name: `auto_inferred_${domain}`,
      fields: []
    };
  }

  return inferSchemaFromDom(domSummary, domain);
}

module.exports = {
  inferSchemaFromDom,
  inferSchemaFromHtml,
  detectRepeatedBlocks,
  inferFieldNames,
  inferFieldTypes
};