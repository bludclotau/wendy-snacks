function extractNumericValues(rows, field) {
  return rows
    .map(r => parseFloat(r[field]))
    .filter(v => !isNaN(v));
}

function computeMean(values) {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function computeStdDev(values, mean) {
  if (values.length < 2) return 0;
  const sqDiffs = values.map(v => Math.pow(v - mean, 2));
  return Math.sqrt(sqDiffs.reduce((a, b) => a + b, 0) / values.length);
}

function detectTrends(rows, schema) {
  const trends = [];
  const numericFields = (schema.fields || [])
    .filter(f => f.type === 'number' || f.type === 'string')
    .map(f => f.name);

  for (const field of numericFields) {
    const values = extractNumericValues(rows, field);
    if (values.length < 3) continue;

    let increasing = true;
    let decreasing = true;
    for (let i = 1; i < values.length; i++) {
      if (values[i] <= values[i - 1]) increasing = false;
      if (values[i] >= values[i - 1]) decreasing = false;
    }

    if (increasing || decreasing) {
      trends.push({
        field,
        direction: increasing ? 'increasing' : 'decreasing',
        values: values.slice(-5)
      });
    }
  }

  return trends;
}

function detectAnomalies(rows, schema) {
  const anomalies = [];
  const numericFields = (schema.fields || [])
    .filter(f => f.type === 'number' || f.type === 'string')
    .map(f => f.name);

  for (const field of numericFields) {
    const values = extractNumericValues(rows, field);
    if (values.length < 3) continue;

    const mean = computeMean(values);
    const stdDev = computeStdDev(values, mean);
    if (stdDev === 0) continue;

    for (let i = 0; i < values.length; i++) {
      const zScore = Math.abs((values[i] - mean) / stdDev);
      if (zScore > 2) {
        anomalies.push({
          field,
          index: i,
          value: values[i],
          zScore: zScore.toFixed(2),
          type: values[i] > mean ? 'spike' : 'drop'
        });
      }
    }
  }

  return anomalies;
}

function computeRollingAverage(rows, field, window = 3) {
  const values = extractNumericValues(rows, field);
  if (values.length < window) return [];

  const result = [];
  for (let i = window - 1; i < values.length; i++) {
    const slice = values.slice(i - window + 1, i + 1);
    result.push(computeMean(slice));
  }
  return result;
}

function computeCorrelation(rows, fieldA, fieldB) {
  const valuesA = extractNumericValues(rows, fieldA);
  const valuesB = extractNumericValues(rows, fieldB);

  const n = Math.min(valuesA.length, valuesB.length);
  if (n < 2) return 0;

  const sliceA = valuesA.slice(0, n);
  const sliceB = valuesB.slice(0, n);

  const meanA = computeMean(sliceA);
  const meanB = computeMean(sliceB);

  let num = 0;
  let denA = 0;
  let denB = 0;
  for (let i = 0; i < n; i++) {
    const diffA = sliceA[i] - meanA;
    const diffB = sliceB[i] - meanB;
    num += diffA * diffB;
    denA += diffA * diffA;
    denB += diffB * diffB;
  }

  if (denA === 0 || denB === 0) return 0;
  return num / Math.sqrt(denA * denB);
}

function summarize(rows, schema) {
  const summary = { rowCount: rows.length };
  const numericFields = (schema.fields || [])
    .filter(f => f.type === 'number' || f.type === 'string')
    .map(f => f.name);

  for (const field of numericFields) {
    const values = extractNumericValues(rows, field);
    if (values.length === 0) continue;

    const sorted = [...values].sort((a, b) => a - b);
    const mean = computeMean(values);
    const stdDev = computeStdDev(values, mean);

    summary[field] = {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      mean: mean.toFixed(2),
      median: sorted[Math.floor(sorted.length / 2)],
      stddev: stdDev.toFixed(2),
      count: values.length
    };
  }

  return summary;
}

module.exports = {
  detectTrends,
  detectAnomalies,
  computeRollingAverage,
  computeCorrelation,
  summarize
};