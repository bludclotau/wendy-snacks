const SYNONYMS = {
  'chg': 'change',
  'pct': 'percent',
  'vol': 'volume',
  'ask': 'price',
  'bid': 'price',
  'hi': 'high',
  'lo': 'low'
};

function normalizeColumnName(name) {
  if (!name) return 'col';
  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, '_')
    .trim() || 'col';
}

function normalizeSchema(schema) {
  if (!schema || !schema.fields) return { fields: [] };

  const normalized = schema.fields.map(f => {
    const name = normalizeColumnName(f.name);
    let finalName = SYNONYMS[name] || name;
    return { name: finalName, type: f.type || 'string' };
  });

  return { name: schema.name, fields: normalized };
}

function alignColumns(tables) {
  const allColumns = new Set();

  for (const t of tables) {
    if (t.schema && t.schema.fields) {
      for (const f of t.schema.fields) {
        allColumns.add(normalizeColumnName(f.name));
      }
    }
  }

  const aligned = tables.map(t => {
    const rows = t.rows || [];
    return {
      ...t,
      rows: rows.map(row => {
        const alignedRow = {};
        for (const col of allColumns) {
          alignedRow[col] = row[col] ?? row[normalizeColumnName(col)] ?? null;
        }
        return alignedRow;
      })
    };
  });

  return { alignedTables: aligned, unionColumns: Array.from(allColumns) };
}

function detectPrimaryKey(schema) {
  if (!schema || !schema.fields) return '__row_index';

  for (const f of schema.fields) {
    const name = f.name?.toLowerCase();
    if (name === 'symbol' || name === 'ticker' || name === 'code') {
      return f.name;
    }
  }

  for (const f of schema.fields) {
    const name = f.name?.toLowerCase();
    if (name === 'name' || name === 'company' || name === 'title') {
      return f.name;
    }
  }

  return '__row_index';
}

function mergeRows(tables, aligned, unionColumns) {
  const seen = new Set();
  const merged = [];
  const primaryKey = tables[0]?.schema ? detectPrimaryKey(tables[0].schema) : '__row_index';

  for (const t of aligned) {
    for (const row of t.rows) {
      if (primaryKey === '__row_index') {
        merged.push(row);
      } else {
        const key = row[primaryKey];
        if (!key || !seen.has(key)) {
          if (key) seen.add(key);
          merged.push(row);
        }
      }
    }
  }

  return merged;
}

function fuseTables(tables) {
  if (!tables || tables.length === 0) {
    return { fusedSchema: null, fusedRows: [] };
  }

  const normalized = tables.map(t => ({
    ...t,
    schema: normalizeSchema(t.schema || {})
  }));

  const { alignedTables, unionColumns } = alignColumns(normalized);

  const merged = mergeRows(normalized, alignedTables, unionColumns);

  return {
    fusedSchema: { fields: unionColumns.map(c => ({ name: c, type: 'string' })) },
    fusedRows: merged
  };
}

module.exports = {
  fuseTables,
  normalizeSchema,
  alignColumns,
  mergeRows,
  detectPrimaryKey,
  SYNONYMS
};