async function run({ page, action, log }) {
  await page.waitForSelector(action.waitForSelector, { timeout: 8000 });
  log('info', 'wait_success', { selector: action.waitForSelector });
  return { type: 'wait_result' };
}

module.exports = { run };