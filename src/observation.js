function log(level, message, data = {}) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...data
  }));
}

function compressDom(html) {
  try {
    let cleaned = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '');

    const tagRegex = /<(div|p|span|a|h1|h2|h3|li|section|article)([^>]*)>(.*?)<\/\1>/gis;
    const matches = [...cleaned.matchAll(tagRegex)];

    return matches.map((m, i) => {
      const tag = m[1];
      const attrs = m[2];
      const text = m[3].replace(/\s+/g, ' ').trim().slice(0, 200);

      const id = /id="([^"]+)"/.exec(attrs)?.[1];
      const cls = /class="([^"]+)"/.exec(attrs)?.[1]?.split(' ')[0];

      return {
        i,
        t: tag,
        id: id || null,
        c: cls || null,
        x: text
      };
    });
  } catch {
    return [];
  }
}

module.exports = { compressDom };