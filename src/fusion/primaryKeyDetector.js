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

module.exports = {
  detectPrimaryKey
};