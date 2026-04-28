const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const BASE_DIR = path.join(__dirname, '..', 'memory', 'time-series');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function makeSeriesKey({ domain, path: urlPath, queryHash }) {
  const combined = `${domain}:${urlPath || '/'}:${queryHash || 'default'}`;
  return crypto.createHash('sha1').update(combined).digest('hex').slice(0, 16);
}

function snapshotPath(key, timestamp) {
  return path.join(BASE_DIR, key, `${timestamp}.json`);
}

function indexPath(key) {
  return path.join(BASE_DIR, key, 'index.json');
}

function loadIndex(key) {
  const p = indexPath(key);
  if (fs.existsSync(p)) {
    try {
      return JSON.parse(fs.readFileSync(p, 'utf8'));
    } catch {
      return { key, snapshots: [] };
    }
  }
  return { key, snapshots: [] };
}

function saveIndex(key, index) {
  ensureDir(path.join(BASE_DIR, key));
  fs.writeFileSync(indexPath(key), JSON.stringify(index, null, 2), 'utf8');
}

function appendSnapshot({ key, timestamp, schema, rows, meta }) {
  ensureDir(path.join(BASE_DIR, key));

  const snapshot = {
    timestamp,
    schema,
    rows,
    meta
  };

  const snapshotFile = snapshotPath(key, timestamp);
  fs.writeFileSync(snapshotFile, JSON.stringify(snapshot, null, 2), 'utf8');

  const idx = loadIndex(key);
  idx.snapshots.push({ timestamp, file: `${timestamp}.json` });
  saveIndex(key, idx);

  return { key, timestamp, rowsCount: rows.length };
}

function loadSeries(key, options = {}) {
  const { limit, since, until } = options;
  const idx = loadIndex(key);

  let snapshots = idx.snapshots
    .filter(s => (!since || s.timestamp >= since) && (!until || s.timestamp <= until))
    .sort((a, b) => a.timestamp - b.timestamp);

  if (limit) {
    snapshots = snapshots.slice(-limit);
  }

  return snapshots.map(s => {
    const p = snapshotPath(key, s.timestamp);
    try {
      return JSON.parse(fs.readFileSync(p, 'utf8'));
    } catch {
      return null;
    }
  }).filter(Boolean);
}

function listSeriesKeys() {
  if (!fs.existsSync(BASE_DIR)) return [];
  return fs.readdirSync(BASE_DIR).filter(f => !f.startsWith('.'));
}

function getLatestTimestamp(key) {
  const idx = loadIndex(key);
  if (idx.snapshots.length === 0) return null;
  idx.snapshots.sort((a, b) => b.timestamp - a.timestamp);
  return idx.snapshots[0].timestamp;
}

async function saveRawSnapshot(seriesKey, rows) {
  const dir = path.join('data', 'time-series', seriesKey, 'raw');
  ensureDir(dir);
  const file = path.join(dir, `${Date.now()}.json`);
  fs.writeFileSync(file, JSON.stringify(rows, null, 2));
  return file;
}

async function loadRawPoints(seriesKey) {
  const dir = path.join('data', 'time-series', seriesKey, 'raw');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .map(f => {
      try {
        return JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .flat();
}

module.exports = {
  appendSnapshot,
  loadSeries,
  listSeriesKeys,
  makeSeriesKey,
  getLatestTimestamp,
  saveRawSnapshot,
  loadRawPoints
};