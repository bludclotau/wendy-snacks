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

function extractValues(rows, field) {
  return rows.map(r => parseFloat(r[field])).filter(v => !isNaN(v));
}

function compareLatestSnapshots(snapshots, count = 2) {
  if (snapshots.length < count) return null;

  const latest = snapshots.slice(-count);
  const deltas = {};

  const latestSchema = latest[latest.length - 1]?.schema;
  if (!latestSchema?.fields) return null;

  const fields = latestSchema.fields.map(f => f.name);

  for (const field of fields) {
    const values = extractValues(latest[latest.length - 1].rows, field);
    const prevValues = extractValues(latest[latest.length - count].rows, field);

    if (values.length > 0 && prevValues.length > 0) {
      const current = values[values.length - 1];
      const previous = prevValues[prevValues.length - 1];

      if (previous !== 0) {
        deltas[field] = {
          current,
          previous,
          change: ((current - previous) / previous * 100).toFixed(2) + '%'
        };
      }
    }
  }

  return {
    snapshotCount: latest.length,
    deltas
  };
}

function detectLongTermTrend(snapshots, field) {
  if (snapshots.length < 3) return null;

  const points = snapshots
    .map((s, i) => {
      const vals = extractValues(s.rows, field);
      return vals.length > 0 ? { t: s.timestamp, y: vals[0] } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.t - b.t);

  if (points.length < 2) return null;

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  const n = points.length;

  for (let i = 0; i < n; i++) {
    const x = i;
    const y = points[i].y;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const direction = slope > 0.01 ? 'increasing' : slope < -0.01 ? 'decreasing' : 'stable';

  return {
    field,
    direction,
    slope: slope.toFixed(4),
    points: points.length
  };
}

module.exports = {
  detectTrends,
  detectAnomalies,
  computeRollingAverage,
  computeCorrelation,
  summarize,
  compareLatestSnapshots,
  detectLongTermTrend
};