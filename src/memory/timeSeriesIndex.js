const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const BASE_DIR = path.join(__dirname, '..', 'memory', 'time-series');

function indexSnapshot(key, timestamp) {
  const jsonPath = path.join(BASE_DIR, key, 'index.json');
  let idx = { key, snapshots: [] };

  if (fs.existsSync(jsonPath)) {
    try {
      idx = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    } catch {
      idx = { key, snapshots: [] };
    }
  }

  idx.snapshots.push({ timestamp, file: `${timestamp}.json` });
  idx.snapshots.sort((a, b) => a.timestamp - b.timestamp);

  return idx;
}

function getIndex(key) {
  const jsonPath = path.join(BASE_DIR, key, 'index.json');
  if (!fs.existsSync(jsonPath)) {
    return { key, snapshots: [] };
  }
  try {
    return JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  } catch {
    return { key, snapshots: [] };
  }
}

module.exports = {
  indexSnapshot,
  getIndex
};