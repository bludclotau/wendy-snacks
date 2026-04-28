const { loadSeries, listSeriesKeys } = require('../memory/timeSeriesStore');

function loadMultipleSeries(seriesKeys, options = {}) {
  const result = [];

  for (const key of seriesKeys) {
    const series = loadSeries(key, options);
    result.push({ seriesKey: key, snapshots: series });
  }

  return result;
}

function alignTimeAxes(seriesArray) {
  const allTimestamps = new Set();

  for (const { snapshots } of seriesArray) {
    for (const s of snapshots) {
      if (s.timestamp) allTimestamps.add(s.timestamp);
    }
  }

  const timeline = Array.from(allTimestamps).sort((a, b) => a - b);

  return seriesArray.map(({ seriesKey, snapshots }) => {
    const aligned = timeline.map(ts => {
      const match = snapshots.find(s => s.timestamp === ts);
      if (match) return { timestamp: ts, rows: match.rows };
      return { timestamp: ts, rows: null };
    });
    return { seriesKey, aligned };
  });
}

function computeCrossCorrelation(alignedSeries, field) {
  const seriesA = alignedSeries[0]?.aligned || [];
  const seriesB = alignedSeries[1]?.aligned || [];

  if (seriesA.length < 2 || seriesB.length < 2) return 0;

  const valuesA = [];
  const valuesB = [];

  for (let i = 0; i < seriesA.length; i++) {
    if (seriesA[i].rows && seriesB[i].rows) {
      const valA = parseFloat(seriesA[i].rows[0]?.[field]);
      const valB = parseFloat(seriesB[i].rows[0]?.[field]);
      if (!isNaN(valA) && !isNaN(valB)) {
        valuesA.push(valA);
        valuesB.push(valB);
      }
    }
  }

  if (valuesA.length < 2) return 0;

  const meanA = valuesA.reduce((a, b) => a + b, 0) / valuesA.length;
  const meanB = valuesB.reduce((a, b) => a + b, 0) / valuesB.length;

  let num = 0;
  let denA = 0;
  let denB = 0;

  for (let i = 0; i < valuesA.length; i++) {
    const diffA = valuesA[i] - meanA;
    const diffB = valuesB[i] - meanB;
    num += diffA * diffB;
    denA += diffA * diffA;
    denB += diffB * diffB;
  }

  if (denA === 0 || denB === 0) return 0;
  return num / Math.sqrt(denA * denB);
}

function detectSynchronizedEvents(alignedSeries, field, toleranceMs = 3600000) {
  const events = [];

  const threshold = 2;
  const seriesA = alignedSeries[0]?.aligned || [];
  const seriesB = alignedSeries[1]?.aligned || [];

  const allRows = [...seriesA, ...seriesB].filter(r => r.rows);

  for (let i = 0; i < allRows.length; i++) {
    const current = allRows[i];
    const val = parseFloat(current.rows?.[0]?.[field]);
    if (isNaN(val)) continue;

    const mean = allRows.reduce((a, r) => {
      const v = parseFloat(r.rows?.[0]?.[field]);
      return isNaN(v) ? a : a + v;
    }, 0) / allRows.length;
    const stdDev = Math.sqrt(allRows.reduce((a, r) => {
      const v = parseFloat(r.rows?.[0]?.[field]);
      return isNaN(v) ? a : a + Math.pow(v - mean, 2);
    }, 0) / allRows.length);

    if (stdDev > 0) {
      const zScore = Math.abs((val - mean) / stdDev);
      if (zScore > threshold) {
        events.push({
          timestamp: current.timestamp,
          value: val,
          zScore: zScore.toFixed(2),
          type: val > mean ? 'spike' : 'drop'
        });
      }
    }
  }

  return events;
}

module.exports = {
  loadMultipleSeries,
  alignTimeAxes,
  computeCrossCorrelation,
  detectSynchronizedEvents
};