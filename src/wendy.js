const https = require('https');
const http = require('http');

function wendy(url) {
  const startTime = Date.now();
  const protocol = url.startsWith('https') ? https : http;

  const log = (statusCode, responseLength, error = null) => {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      url,
      statusCode,
      responseLength,
      errors: error ? [error.message] : []
    }));
  };

  const req = protocol.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      log(res.statusCode, Buffer.byteLength(data));
    });
  });

  req.on('error', (err) => {
    log(null, 0, err);
  });

  req.setTimeout(5000, () => {
    req.destroy();
    log(null, 0, new Error('Request timeout'));
  });
}

module.exports = wendy;