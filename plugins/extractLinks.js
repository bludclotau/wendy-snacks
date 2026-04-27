function log(level, message, data = {}) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...data
  }));
}

async function run(html, url) {
  log('info', 'plugin_start', { url });

  const linkRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>/gi;
  const links = [];
  let match;

  while ((match = linkRegex.exec(html)) !== null) {
    links.push(match[1]);
  }

  log('info', 'links_found', { count: links.length });

  const absoluteLinks = links.map(link => {
    try {
      return new URL(link, url).href;
    } catch {
      return link;
    }
  });

  const normalizedCount = absoluteLinks.filter((link, i) => link !== links[i]).length;

  log('info', 'links_normalized', { count: normalizedCount });

  log('info', 'plugin_complete', { url, linkCount: absoluteLinks.length });

  return absoluteLinks;
}

module.exports = { run };