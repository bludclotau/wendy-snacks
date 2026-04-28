async function run({ page, action, log }) {
  const rows = [];

  const today = await page.$('.day.main');
  if (today) {
    const date = await today.$eval('h2', el => el.innerText.trim());

    const max = await today.$eval('.forecast .max', el => el.innerText.trim())
      .catch(() => null);

    const summary = await today.$eval('.forecast .summary', el => el.innerText.trim())
      .catch(() => null);

    rows.push({
      date,
      minTemp: null,
      maxTemp: max,
      description: summary
    });
  }

  const future = await page.$$('.day:not(.main)');
  for (const day of future) {
    const date = await day.$eval('h2', el => el.innerText.trim())
      .catch(() => null);

    const min = await day.$eval('.forecast .min', el => el.innerText.trim())
      .catch(() => null);

    const max = await day.$eval('.forecast .max', el => el.innerText.trim())
      .catch(() => null);

    const summary = await day.$eval('.forecast .summary', el => el.innerText.trim())
      .catch(() => null);

    rows.push({
      date,
      minTemp: min,
      maxTemp: max,
      description: summary
    });
  }

  log('info', 'extract_forecast_success', { count: rows.length });

  return {
    type: 'forecast_rows',
    rows
  };
}

module.exports = { run };