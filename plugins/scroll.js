async function run({ page, action, log }) {
  await page.evaluate(y => window.scrollBy(0, y), action.scrollY || 300);
  log('info', 'scroll_success', { scrollY: action.scrollY });
  return { type: 'scroll_result' };
}

module.exports = { run };