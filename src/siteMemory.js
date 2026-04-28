const fs = require('fs');
const path = require('path');

const MEMORY_BASE = path.join(__dirname, '..', 'memory', 'sites');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function domainPath(domain) {
  return path.join(MEMORY_BASE, domain);
}

function schemaPath(domain) {
  return path.join(domainPath(domain), 'schema.json');
}

function extractorPath(domain) {
  return path.join(domainPath(domain), 'extractor.js');
}

function metadataPath(domain) {
  return path.join(domainPath(domain), 'metadata.json');
}

function snapshotsPath(domain) {
  return path.join(domainPath(domain), 'snapshots');
}

function loadMetadata(domain) {
  const p = metadataPath(domain);
  if (fs.existsSync(p)) {
    try {
      return JSON.parse(fs.readFileSync(p, 'utf8'));
    } catch {
      return {};
    }
  }
  return {};
}

function saveMetadata(domain, data) {
  const p = metadataPath(domain);
  ensureDir(domainPath(domain));
  const existing = loadMetadata(domain);
  const merged = { ...existing, ...data, lastUpdated: Date.now() };
  fs.writeFileSync(p, JSON.stringify(merged, null, 2), 'utf8');
}

function loadSiteMemory(domain) {
  const mem = {
    domain,
    hasSchema: false,
    hasExtractor: false,
    schema: null,
    extractorPath: null,
    snapshots: [],
    metadata: {}
  };

  if (fs.existsSync(domainPath(domain))) {
    if (fs.existsSync(schemaPath(domain))) {
      try {
        mem.schema = JSON.parse(fs.readFileSync(schemaPath(domain), 'utf8'));
        mem.hasSchema = true;
      } catch {
        mem.schema = null;
      }
    }

    if (fs.existsSync(extractorPath(domain))) {
      mem.extractorPath = extractorPath(domain);
      mem.hasExtractor = true;
    }

    const snapsDir = snapshotsPath(domain);
    if (fs.existsSync(snapsDir)) {
      try {
        mem.snapshots = fs.readdirSync(snapsDir).filter(f => f.endsWith('.html'));
      } catch {
        mem.snapshots = [];
      }
    }

    mem.metadata = loadMetadata(domain);
  }

  return mem;
}

function saveSchema(domain, schema) {
  const p = schemaPath(domain);
  ensureDir(domainPath(domain));
  fs.writeFileSync(p, JSON.stringify(schema, null, 2), 'utf8');
  saveMetadata(domain, { schemaVersion: Date.now() });
}

function saveExtractor(domain, pluginPath) {
  const dest = extractorPath(domain);
  ensureDir(domainPath(domain));
  if (fs.existsSync(pluginPath)) {
    const content = fs.readFileSync(pluginPath, 'utf8');
    fs.writeFileSync(dest, content, 'utf8');
    saveMetadata(domain, { extractorVersion: Date.now(), extractorValid: true });
  }
}

function markExtractorInvalid(domain) {
  saveMetadata(domain, { extractorValid: false, extractorInvalidAt: Date.now() });
}

function saveSnapshotMetadata(domain, snapshotMeta) {
  const snapsDir = snapshotsPath(domain);
  ensureDir(snapsDir);
  const metaPath = path.join(snapsDir, 'metadata.json');
  let meta = [];
  if (fs.existsSync(metaPath)) {
    try {
      meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    } catch {
      meta = [];
    }
  }
  meta.push(snapshotMeta);
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf8');
}

function hasExtractor(domain) {
  return fs.existsSync(extractorPath(domain));
}

function hasSchema(domain) {
  return fs.existsSync(schemaPath(domain));
}

module.exports = {
  loadSiteMemory,
  saveSchema,
  saveExtractor,
  saveSnapshotMetadata,
  hasExtractor,
  hasSchema
};