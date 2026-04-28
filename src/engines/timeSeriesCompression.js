function toMs(ts) {
  if (typeof ts === 'number') return ts;
  if (ts instanceof Date) return ts.getTime();
  return new Date(ts).getTime();
}

function normalizeAndSort(points) {
  return points
    .map(p => ({ ...p, ts: toMs(p.ts) }))
    .filter(p => Number.isFinite(p.ts) && typeof p.value === 'number')
    .sort((a, b) => a.ts - b.ts);
}

function bucketByWindow(points, windowMs) {
  if (!points.length) return [];
  const buckets = [];
  let bucketStart = points[0].ts - (points[0].ts % windowMs);
  let bucketEnd = bucketStart + windowMs;

  let current = {
    tsStart: bucketStart,
    tsEnd: bucketEnd,
    open: null,
    close: null,
    high: -Infinity,
    low: Infinity,
    sum: 0,
    count: 0,
  };

  for (const p of points) {
    while (p.ts >= current.tsEnd) {
      if (current.count > 0) {
        buckets.push({
          ts: Math.round((current.tsStart + current.tsEnd) / 2),
          open: current.open,
          close: current.close,
          high: current.high,
          low: current.low,
          avg: current.sum / current.count,
          count: current.count,
        });
      }
      bucketStart = current.tsEnd;
      bucketEnd = bucketStart + windowMs;
      current = {
        tsStart: bucketStart,
        tsEnd: bucketEnd,
        open: null,
        close: null,
        high: -Infinity,
        low: Infinity,
        sum: 0,
        count: 0,
      };
    }

    if (current.open === null) current.open = p.value;
    current.close = p.value;
    if (p.value > current.high) current.high = p.value;
    if (p.value < current.low) current.low = p.value;
    current.sum += p.value;
    current.count += 1;
  }

  if (current.count > 0) {
    buckets.push({
      ts: Math.round((current.tsStart + current.tsEnd) / 2),
      open: current.open,
      close: current.close,
      high: current.high,
      low: current.low,
      avg: current.sum / current.count,
      count: current.count,
    });
  }

  return buckets;
}

function strideDownsample(buckets, targetMax) {
  if (buckets.length <= targetMax) return buckets;
  const stride = Math.ceil(buckets.length / targetMax);
  const out = [];
  for (let i = 0; i < buckets.length; i += stride) {
    out.push(buckets[i]);
  }
  return out;
}

function buildMultiResolutionSeries({ seriesKey, points, config = {} }) {
  const {
    targetPointsPerResolution = 512,
    resolutions = [
      { id: '1m', windowMs: 60 * 1000 },
      { id: '5m', windowMs: 5 * 60 * 1000 },
      { id: '1h', windowMs: 60 * 60 * 1000 },
      { id: '1d', windowMs: 24 * 60 * 60 * 1000 },
    ],
  } = config;

  const normalized = normalizeAndSort(points);
  const out = {};

  for (const res of resolutions) {
    const buckets = bucketByWindow(normalized, res.windowMs);
    const compressed = strideDownsample(buckets, targetPointsPerResolution);
    out[res.id] = {
      windowMs: res.windowMs,
      points: compressed,
    };
  }

  return {
    seriesKey,
    resolutions: out,
    stats: {
      inputPoints: Array.isArray(points) ? points.length : 0,
      normalizedPoints: normalized.length,
    },
  };
}

module.exports = {
  buildMultiResolutionSeries,
};