function extractValues(series, field) {
  return series
    .map((s, i) => ({ t: i, y: parseFloat(s.rows?.[0]?.[field]) }))
    .filter(p => !isNaN(p.y));
}

function computeLinearForecast(series, field, horizon = 5) {
  const points = extractValues(series, field);
  if (points.length < 2) return [];

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

  const forecast = [];
  for (let h = 1; h <= horizon; h++) {
    const futureX = points.length + h - 1;
    forecast.push({
      step: h,
      value: parseFloat((slope * futureX + intercept).toFixed(2))
    });
  }

  return forecast;
}

function computeEMA(series, field, alpha = 0.3) {
  const points = extractValues(series, field);
  if (points.length < 2) return [];

  let ema = points[0].y;
  const result = [];

  for (const { y } of points) {
    ema = alpha * y + (1 - alpha) * ema;
    result.push(parseFloat(ema.toFixed(2)));
  }

  return result;
}

function computeHoltTrend(series, field, alpha = 0.3, beta = 0.1) {
  const points = extractValues(series, field);
  if (points.length < 2) return { level: [], trend: [] };

  let level = points[0].y;
  let trend = points[1].y - points[0].y;

  const levelResult = [level];
  const trendResult = [trend];

  for (let i = 1; i < points.length; i++) {
    const prevLevel = level;
    level = alpha * points[i].y + (1 - alpha) * (level + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
    levelResult.push(parseFloat(level.toFixed(2)));
    trendResult.push(parseFloat(trend.toFixed(2)));
  }

  return { level: levelResult, trend: trendResult };
}

function computeVolatilityAdjustedForecast(series, field, horizon = 5) {
  const points = extractValues(series, field);
  if (points.length < 2) return [];

  const mean = points.reduce((a, p) => a + p.y, 0) / points.length;
  const sqDiffs = points.map(p => Math.pow(p.y - mean, 2));
  const variance = sqDiffs.reduce((a, b) => a + b, 0) / points.length;
  const volatility = Math.sqrt(variance);

  const linear = computeLinearForecast(series, field, horizon);

  return linear.map(l => ({
    step: l.step,
    value: l.value,
    upper: parseFloat((l.value + volatility).toFixed(2)),
    lower: parseFloat((l.value - volatility).toFixed(2))
  }));
}

function summarizeForecast(series, field, horizon = 5) {
  return {
    linear: computeLinearForecast(series, field, horizon),
    ema: computeEMA(series, field, 0.3).slice(-5),
    holt: computeHoltTrend(series, field, 0.3, 0.1),
    volatilityBands: computeVolatilityAdjustedForecast(series, field, horizon),
    snapshotCount: series.length
  };
}

module.exports = {
  computeLinearForecast,
  computeEMA,
  computeHoltTrend,
  computeVolatilityAdjustedForecast,
  summarizeForecast
};