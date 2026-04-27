async function run({ page }) {
  const html = await page.content();
  return { type: 'rendered_html', html };
}

module.exports = { run };