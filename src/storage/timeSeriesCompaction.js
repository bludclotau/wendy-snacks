const fs = require('fs');
const path = require('path');
const { buildMultiResolutionSeries } = require('../engines/timeSeriesCompression');

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function pruneRawSnapshots(seriesKey, { retentionMs = 7 * 24 * 60 * 60 * 1000 }) {
  const dir = path.join('data', 'time-series', seriesKey, 'raw');
  if (!fs.existsSync(dir)) return { removed: 0, kept: 0 };

  const now = Date.now();
  let removed = 0;
  let kept = 0;

  for (const file of fs.readdirSync(dir)) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (now - stat.mtimeMs > retentionMs) {
      fs.unlinkSync(full);
      removed++;
    } else {
      kept++;
    }
  }

  return { removed, kept };
}

function writeCompressedSeries(seriesKey, compressed) {
  const dir = path.join('data', 'time-series', seriesKey);
  ensureDir(dir);
  const outPath = path.join(dir, 'compressed.json');
  fs.writeFileSync(outPath, JSON.stringify(compressed, null, 2));
  return outPath;
}

function loadCompressedSeries(seriesKey) {
  const p = path.join('data', 'time-series', seriesKey, 'compressed.json');
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function compactSeries(seriesKey, { retentionMs } = {}) {
  const rawDir = path.join('data', 'time-series', seriesKey, 'raw');
  const rawFiles = fs.existsSync(rawDir) ? fs.readdirSync(rawDir) : [];

  const rawPoints = rawFiles
    .map(f => {
      try {
        const full = path.join(rawDir, f);
        return JSON.parse(fs.readFileSync(full, 'utf8'));
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .flat();

  const compressed = buildMultiResolutionSeries({
    seriesKey,
    points: rawPoints,
  });

  const outPath = writeCompressedSeries(seriesKey, compressed);
  const pruneStats = pruneRawSnapshots(seriesKey, { retentionMs });

  return {
    seriesKey,
    rawBefore: rawFiles.length,
    rawAfter: pruneStats.kept,
    pruned: pruneStats.removed,
    compressedPoints: compressed.stats.normalizedPoints,
    resolutions: Object.keys(compressed.resolutions),
    outPath,
  };
}

module.exports = {
  compactSeries,
  pruneRawSnapshots,
  writeCompressedSeries,
  loadCompressedSeries,
};