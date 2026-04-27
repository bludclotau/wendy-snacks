async function run({ page, action, log }) {
  const { selector } = action;
  if (!selector) {
    throw new Error('dom-click requires selector');
  }

  await page.click(selector, { timeout: 5000 });
  log('info', 'dom_click_success', { selector });

  return {
    type: 'click_result',
    selector
  };
}

module.exports = { run };