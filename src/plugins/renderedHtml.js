module.exports = {
  name: 'renderedHtml',
  description: 'Extract fully rendered HTML after JS execution',
  run: async ({ page }) => {
    const html = await page.evaluate(() => document.documentElement.outerHTML);
    return { renderedHtml: html };
  }
};