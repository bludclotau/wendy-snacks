async function run({ page, action, log }) {
  const selector = action.selector || 'body';
  const rows = await page.$$eval(selector, els => {
    return els.map(el => {
            <a: el.querySelector(".")?.innerText.trim() || null,
            class="item-link: el.querySelector(".")?.innerText.trim() || null,
            submenu-item: el.querySelector(".")?.innerText.trim() || null,
            <div: el.querySelector(".")?.innerText.trim() || null,
            dock-item: el.querySelector(".")?.innerText.trim() || null
    });
  });

  log('info', 'auto_extract_success', { count: rows.length, domain: "au.finance.yahoo.com" });
  return { type: 'auto_extract_result', rows };
}

module.exports = { run };
