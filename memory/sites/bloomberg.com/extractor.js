async function run({ page, action, log }) {
  const selector = action.selector || 'body';
  const rows = await page.$$eval(selector, els => {
    return els.map(el => {
            box: el.querySelector(".")?.innerText.trim() || null,
            <h3: el.querySelector(".")?.innerText.trim() || null,
            info: el.querySelector(".")?.innerText.trim() || null,
            <h2: el.querySelector(".")?.innerText.trim() || null,
            class="main__heading">we've: el.querySelector(".")?.innerText.trim() || null
    });
  });

  log('info', 'auto_extract_success', { count: rows.length, domain: "bloomberg.com" });
  return { type: 'auto_extract_result', rows };
}

module.exports = { run };
