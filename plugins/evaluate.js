async function run({ page, action }) {
  const result = await page.evaluate(action.evaluate);
  return { type: 'evaluate_result', result };
}

module.exports = { run };