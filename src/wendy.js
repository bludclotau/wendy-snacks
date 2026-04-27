const { fetch } = require('undici');
const fs = require('fs');
const path = require('path');

let config;
try {
  config = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config', 'default.json'), 'utf8'));
} catch (err) {
  console.error(`Failed to load config: ${err.message}`);
  process.exit(1);
}

function log(level, message, data = {}) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...data
  }));
}

async function fetchPage(url) {
  const startTime = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  log('info', 'fetch_started', { url });

  try {
    const response = await fetch(url, {
      maxRedirections: config.maxRedirects,
      signal: controller.signal,
      headers: {
        'User-Agent': config.userAgent || 'Wendy-Snacks/1.0'
      }
    });

    clearTimeout(timeout);

    const finalUrl = response.url;
    if (finalUrl !== url) {
      log('info', 'fetch_redirect', { from: url, to: finalUrl });
    }
    const content = await response.text();
    const contentLength = Buffer.byteLength(content);
    const durationMs = Date.now() - startTime;

    log('info', 'fetch_complete', {
      url,
      finalUrl,
      status: response.status,
      contentLength,
      durationMs
    });

    const headers = {};
    response.headers.forEach((value, key) => { headers[key] = value; });

    return {
      url,
      finalUrl,
      status: response.status,
      headers,
      content,
      contentLength,
      durationMs
    };
  } catch (err) {
    clearTimeout(timeout);
    const durationMs = Date.now() - startTime;

    log('error', 'fetch_error', {
      url,
      error: err.message,
      durationMs
    });

    throw err;
  }
}

async function wendy(url) {
  try {
    await fetchPage(url);
    return true;
  } catch (err) {
    console.error(JSON.stringify({ error: err.message }));
    return false;
  }
}

module.exports = { fetchPage, wendy };