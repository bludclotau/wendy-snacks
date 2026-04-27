async function run({ page, action, log }) {
  const items = await page.$$eval(action.selector, els =>
    els.map(el => el.innerText.trim())
  );
  log('info', 'extract_all_success', { count: items.length });
  return { type: 'extract_all_result', items };
}

module.exports = { run };