const { askGemma } = require('../src/llm.js');

function log(level, message, data = {}) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...data
  }));
}

async function run(html, url, browserContext) {
  log('info', 'plugin_start', { url });

  const messages = [
    { role: 'system', content: 'You are Wendy Snacks, a reasoning agent. Analyze the page.' },
    { role: 'user', content: `URL: ${url}\nHTML:\n${html.slice(0, 5000)}` }
  ];

  const answer = await askGemma(messages);

  log('info', 'plugin_reasoning', { length: answer.length });

  log('info', 'plugin_complete', { url });

  return answer;
}

module.exports = { run };