module.exports = {
  run: async ({ page, log }) => {
    const buffer = await page.screenshot({ fullPage: true });
    log('info', 'screenshot_captured');
    return { type: 'screenshot', buffer: buffer.toString('base64') };
  }
};