async function extractHeadingsFromDom(page) {
  if (!page) return [];

  try {
    const headings = await page.evaluate(() => {
      const results = [];

      const hTags = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      hTags.forEach((el, i) => {
        if (el.innerText.trim()) {
          results.push({
            text: el.innerText.trim(),
            selector: el.tagName.toLowerCase() + ':nth-of-type(' + (i + 1) + ')',
            level: parseInt(el.tagName.charAt(1))
          });
        }
      });

      const ariaLabels = document.querySelectorAll('[aria-label]');
      ariaLabels.forEach((el, i) => {
        if (el.getAttribute('aria-label')?.trim()) {
          results.push({
            text: el.getAttribute('aria-label').trim(),
            selector: '[aria-label]:nth-of-type(' + (i + 1) + ')',
            level: null
          });
        }
      });

      const roleHeading = document.querySelectorAll('[role="heading"]');
      roleHeading.forEach((el, i) => {
        if (el.innerText.trim()) {
          results.push({
            text: el.innerText.trim(),
            selector: '[role="heading"]:nth-of-type(' + (i + 1) + ')',
            level: null
          });
        }
      });

      return results;
    });

    return headings;
  } catch {
    return [];
  }
}

module.exports = {
  extractHeadingsFromDom
};