function log(level, message, data = {}) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...data
  }));
}

async function realLLMCall(messages, model = 'qwen2.5-coder:1.5b') {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 900000);

  try {
    const response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model,
        messages,
        stream: false
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const data = await response.json();
    return data.response || data.message?.content || '';
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

async function askGemma(messages, model = 'qwen2.5-coder:1.5b') {
  log('info', 'llm_request_start');

  for (let i = 0; i < 3; i++) {
    try {
      const content = await realLLMCall(messages, model);
      log('info', 'llm_request_complete', { contentLength: content.length });
      return content;
    } catch (err) {
      if (i === 2) {
        log('error', 'llm_error', { error: err.message });
        throw err;
      }
      log('warn', 'llm_retry_after_fetch_failure', { attempt: i + 1 });
      await new Promise(r => setTimeout(r, 500));
    }
  }
}

module.exports = { askGemma };