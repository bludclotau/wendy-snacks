async function run({ page, action, log }) {
  const { selector } = action;
  if (!selector) {
    throw new Error('dom-extract requires selector');
  }

  const content = await page.$eval(selector, el => el.innerText.trim());
  log('info', 'dom_extract_success', { selector, length: content.length });

  return {
    type: 'extract_result',
    selector,
    content
  };
}

module.exports = { run };