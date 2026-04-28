const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SNAPSHOT_DIR = '/tmp/wendy';
const DATA_DIR = path.join(__dirname, '..', 'data', 'snapshots');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function computeHash(html) {
  return crypto.createHash('sha1').update(html).digest('hex');
}

function extractDomain(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return 'unknown';
  }
}

async function saveSnapshot({ html, url }) {
  const hash = computeHash(html);
  const timestamp = Date.now();

  ensureDir(SNAPSHOT_DIR);
  ensureDir(DATA_DIR);

  const domain = extractDomain(url);
  const domainDir = path.join(DATA_DIR, domain);
  ensureDir(domainDir);

  const tmpPath = path.join(SNAPSHOT_DIR, `${hash}.html`);
  const appPath = path.join(domainDir, `${timestamp}.html`);

  fs.writeFileSync(tmpPath, html, 'utf8');
  fs.writeFileSync(appPath, html, 'utf8');

  const metadata = {
    tmpPath,
    appPath,
    hash,
    timestamp,
    domain,
    url
  };

  return metadata;
}

module.exports = {
  saveSnapshot,
  computeHash,
  extractDomain
};