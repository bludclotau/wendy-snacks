function sanitizeSelector(selector) {
  if (!selector || typeof selector !== 'string') {
    return '.';
  }

  if (selector.length > 300) {
    return '.';
  }

  const htmlPattern = /<[^>]*>/;
  if (htmlPattern.test(selector)) {
    return '.';
  }

  const htmlTags = ['<div', '<table', '<span', '<p>', '<a ', '<img', '<input'];
  for (const tag of htmlTags) {
    if (selector.toLowerCase().includes(tag)) {
      return '.';
    }
  }

  return selector;
}

function sanitizeFieldExtractor(code) {
  if (!code || typeof code !== 'string') {
    return 'null';
  }

  let cleaned = code.replace(/<[^>]*>/g, '');
  cleaned = cleaned.replace(/javascript:/gi, '');
  cleaned = cleaned.replace(/on\w+\s*=/gi, '');

  const allowed = /^[a-zA-Z0-9_ .#>:+\-]+$/;
  if (!allowed.test(cleaned)) {
    cleaned = cleaned.replace(/[^a-zA-Z0-9_ .#>:+\-]/g, '');
  }

  return cleaned || 'null';
}

async function runInSandbox(fn, timeoutMs = 2000) {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve({ error: 'plugin_sandbox_timeout' });
    }, timeoutMs);

    Promise.resolve(fn())
      .then((result) => {
        clearTimeout(timeout);
        resolve(result);
      })
      .catch((err) => {
        clearTimeout(timeout);
        resolve({ error: 'plugin_sandbox_error', message: err.message });
      });
  });
}

function sanitizeCode(code) {
  if (!code || typeof code !== 'string') {
    return { error: 'sanitization_failed' };
  }

  const htmlPattern = /<html|<body|<div|<table|<script/i;
  if (htmlPattern.test(code)) {
    return { error: 'sanitization_failed' };
  }

  try {
    new Function(code);
    return { valid: true };
  } catch {
    return { error: 'sanitization_failed' };
  }
}

module.exports = {
  sanitizeSelector,
  sanitizeFieldExtractor,
  runInSandbox,
  sanitizeCode
};