function extractValues(series, field) {
  return series
    .map((s, i) => ({ t: i, y: parseFloat(s.rows?.[0]?.[field]) }))
    .filter(p => !isNaN(p.y));
}

function computeLinearSlope(series, field) {
  const points = extractValues(series, field);
  if (points.length < 2) return { slope: 0, intercept: 0, r2: 0 };

  const n = points.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

  for (const { t, y } of points) {
    sumX += t;
    sumY += y;
    sumXY += t * y;
    sumX2 += t * t;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  let ssRes = 0;
  let ssTot = 0;
  const mean = sumY / n;

  for (const { t, y } of points) {
    const predicted = slope * t + intercept;
    ssRes += Math.pow(y - predicted, 2);
    ssTot += Math.pow(y - mean, 2);
  }

  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;

  return {
    slope: parseFloat(slope.toFixed(4)),
    intercept: parseFloat(intercept.toFixed(4)),
    r2: parseFloat(r2.toFixed(4))
  };
}

function computeLongMA(series, field, window = 20) {
  const points = extractValues(series, field);
  if (points.length < window) return [];

  const result = [];
  for (let i = window - 1; i < points.length; i++) {
    const slice = points.slice(i - window + 1, i + 1);
    const avg = slice.reduce((a, p) => a + p.y, 0) / slice.length;
    result.push({ index: i, ma: parseFloat(avg.toFixed(4)) });
  }
  return result;
}

function computeVolatility(series, field, window = 20) {
  const points = extractValues(series, field);
  if (points.length < window) return [];

  const result = [];
  for (let i = window - 1; i < points.length; i++) {
    const slice = points.slice(i - window + 1, i + 1);
    const mean = slice.reduce((a, p) => a + p.y, 0) / slice.length;
    const sqDiffs = slice.map(p => Math.pow(p.y - mean, 2));
    const variance = sqDiffs.reduce((a, b) => a + b, 0) / slice.length;
    const stdDev = Math.sqrt(variance);
    result.push({ index: i, volatility: parseFloat(stdDev.toFixed(4)) });
  }
  return result;
}

function detectRegimeShifts(series, field, window = 10) {
  const points = extractValues(series, field);
  if (points.length < window * 2) return [];

  const shifts = [];
  let prevSlope = null;

  for (let i = window; i < points.length - window; i += window) {
    const sliceA = points.slice(i - window, i).map(p => p.y);
    const sliceB = points.slice(i, i + window).map(p => p.y);

    if (sliceA.length === 0 || sliceB.length === 0) continue;

    const slopeA = sliceA[sliceA.length - 1] - sliceA[0];
    const slopeB = sliceB[sliceB.length - 1] - sliceB[0];

    if ((prevSlope !== null) && (Math.sign(slopeA) !== Math.sign(slopeB))) {
      shifts.push({
        index: i,
        prevDirection: slopeA > 0 ? 'up' : 'down',
        newDirection: slopeB > 0 ? 'up' : 'down'
      });
    }
    prevSlope = slopeB;
  }

  return shifts;
}

function summarizeLongHorizon(series, field) {
  const slope = computeLinearSlope(series, field);
  const longMA = computeLongMA(series, field, 20);
  const volatility = computeVolatility(series, field, 20);
  const regimeShifts = detectRegimeShifts(series, field);

  return {
    slope,
    longMA: longMA.slice(-5),
    volatility: volatility.slice(-5),
    regimeShifts,
    snapshotCount: series.length
  };
}

module.exports = {
  computeLinearSlope,
  computeLongMA,
  computeVolatility,
  detectRegimeShifts,
  summarizeLongHorizon
};