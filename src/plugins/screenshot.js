module.exports = {
  name: 'screenshot',
  description: 'Capture a screenshot of the current page',
  run: async ({ page, outputDir = 'screenshots' }) => {
    const fs = require('fs');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

    const file = `${outputDir}/shot-${Date.now()}.png`;
    await page.screenshot({ path: file, fullPage: true });

    return { screenshot: file };
  }
};